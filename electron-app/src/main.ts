import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
  Tray,
  nativeImage,
} from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import Store from "electron-store";
import { TallyDatabaseCore } from "./core-bridge";

// For Windows startup functionality
import { exec } from "child_process";
import { platform } from "os";

class TallyDatabaseLoaderApp {
  private mainWindow: BrowserWindow | null = null;
  private store: Store;
  private tallyCore: TallyDatabaseCore;
  private isDev: boolean;
  private tray: Tray | null = null;
  private isQuitting = false;

  constructor() {
    this.isDev = process.argv.includes("--dev");
    this.store = new Store();
    this.tallyCore = new TallyDatabaseCore();

    this.setupApp();
    this.setupIPC();
    this.setupAutoUpdater();
  }

  private setupApp() {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(async () => {
      this.createWindow();
      this.createMenu();
      this.createTray();

      // Check if background sync should start automatically
      await this.checkAndStartBackgroundSync();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on("window-all-closed", () => {
      // Don't quit the app when all windows are closed
      // Allow it to continue running in background for scheduled sync
      if (process.platform === "darwin" && !this.isQuitting) {
        // On macOS, apps typically stay running even when all windows are closed
        return;
      }

      // On Windows/Linux, only quit if not running background sync
      const config = this.tallyCore.loadConfiguration();
      const hasBackgroundSync =
        config.tally.frequency > 0 && config.tally.sync === "incremental";

      if (!hasBackgroundSync || this.isQuitting) {
        app.quit();
      }
    });

    app.on("before-quit", (event) => {
      const config = this.tallyCore.loadConfiguration();
      const hasBackgroundSync =
        config.tally.frequency > 0 && config.tally.sync === "incremental";

      if (hasBackgroundSync && !this.isQuitting) {
        event.preventDefault();
        this.isQuitting = true;

        if (this.mainWindow) {
          this.mainWindow.hide();
        }

        this.showBackgroundNotification();
        return;
      }

      this.tallyCore.cleanup();
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, "assets/icon.png"),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
      titleBarStyle: "default",
      show: false,
    });

    // Load the renderer
    if (this.isDev) {
      this.mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
    }

    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on("close", (event) => {
      const config = this.tallyCore.loadConfiguration();
      const hasBackgroundSync =
        config.tally.frequency > 0 && config.tally.sync === "incremental";

      if (hasBackgroundSync && !this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
        this.showBackgroundNotification();
        return;
      }
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
  }

  private createMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: "File",
        submenu: [
          {
            label: "New Configuration",
            accelerator: "CmdOrCtrl+N",
            click: () => this.handleNewConfiguration(),
          },
          {
            label: "Open Configuration",
            accelerator: "CmdOrCtrl+O",
            click: () => this.handleOpenConfiguration(),
          },
          {
            label: "Save Configuration",
            accelerator: "CmdOrCtrl+S",
            click: () => this.handleSaveConfiguration(),
          },
          { type: "separator" },
          {
            label: "Import Configuration",
            click: () => this.handleImportConfiguration(),
          },
          {
            label: "Export Configuration",
            click: () => this.handleExportConfiguration(),
          },
          { type: "separator" },
          {
            label: "Exit",
            accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
            click: () => app.quit(),
          },
        ],
      },
      {
        label: "Sync",
        submenu: [
          {
            label: "Start Sync",
            accelerator: "F5",
            click: () => this.handleStartSync(),
          },
          {
            label: "Stop Sync",
            accelerator: "Ctrl+F5",
            click: () => this.handleStopSync(),
          },
          { type: "separator" },
          {
            label: "Test Database Connection",
            click: () => this.handleTestDatabaseConnection(),
          },
          {
            label: "Test Tally Connection",
            click: () => this.handleTestTallyConnection(),
          },
        ],
      },
      {
        label: "Tools",
        submenu: [
          {
            label: "Database Structure",
            click: () => this.handleDatabaseStructure(),
          },
          {
            label: "View Reports",
            click: () => this.handleViewReports(),
          },
          {
            label: "Clear Logs",
            click: () => this.handleClearLogs(),
          },
          { type: "separator" },
          {
            label: "Settings",
            click: () => this.handleSettings(),
          },
        ],
      },
      {
        label: "Help",
        submenu: [
          {
            label: "Documentation",
            click: () =>
              shell.openExternal(
                "https://github.com/your-repo/tally-database-loader/docs"
              ),
          },
          {
            label: "Check for Updates",
            click: () => autoUpdater.checkForUpdatesAndNotify(),
          },
          { type: "separator" },
          {
            label: "About",
            click: () => this.showAboutDialog(),
          },
        ],
      },
    ];

    if (this.isDev) {
      template.push({
        label: "Debug",
        submenu: [
          {
            label: "Toggle Developer Tools",
            accelerator: "F12",
            click: () => this.mainWindow?.webContents.toggleDevTools(),
          },
          {
            label: "Reload",
            accelerator: "CmdOrCtrl+R",
            click: () => this.mainWindow?.reload(),
          },
        ],
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC() {
    // Configuration management
    ipcMain.handle("load-config", () => this.tallyCore.loadConfiguration());
    ipcMain.handle("save-config", (_, config) =>
      this.tallyCore.saveConfiguration(config)
    );
    ipcMain.handle("validate-config", (_, config) =>
      this.tallyCore.validateConfiguration(config)
    );
    ipcMain.handle("restore-config", (_, backupPath) =>
      this.tallyCore.restoreConfigurationFromBackup(backupPath)
    );

    // Database operations
    ipcMain.handle("test-database-connection", (_, config) =>
      this.tallyCore.testDatabaseConnection(config)
    );
    ipcMain.handle("get-database-structure", () =>
      this.tallyCore.getDatabaseStructure()
    );

    // Tally operations
    ipcMain.handle("test-tally-connection", (_, config) =>
      this.tallyCore.testTallyConnection(config)
    );
    ipcMain.handle("get-tally-companies", (_, config) =>
      this.tallyCore.getTallyCompanies(config)
    );

    // Sync operations
    ipcMain.handle("start-sync", async (_, config) => {
      try {
        return await this.tallyCore.startSync(config);
      } catch (error) {
        // Handle the specific case where sync is already running
        if (
          error instanceof Error &&
          error.message === "Sync is already running"
        ) {
          return { error: "Sync is already running" };
        }
        // Re-throw other errors
        throw error;
      }
    });
    ipcMain.handle("stop-sync", () => this.tallyCore.stopSync());
    ipcMain.handle("get-sync-status", () => this.tallyCore.getSyncStatus());
    ipcMain.handle("is-sync-running", () => this.tallyCore.isSyncRunning());

    // File operations
    ipcMain.handle("select-file", async (_, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, options);
      return result.filePaths[0];
    });

    ipcMain.handle("save-file", async (_, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options);
      return result.filePath;
    });

    ipcMain.handle(
      "write-file",
      async (_, filePath: string, content: string) => {
        try {
          fs.writeFileSync(filePath, content, "utf8");
        } catch (error) {
          throw new Error(`Failed to write file: ${error}`);
        }
      }
    );

    ipcMain.handle("read-file", async (_, filePath: string) => {
      try {
        return fs.readFileSync(filePath, "utf8");
      } catch (error) {
        throw new Error(`Failed to read file: ${error}`);
      }
    });

    // Application operations
    ipcMain.handle("get-app-version", () => app.getVersion());
    ipcMain.handle("get-user-data-path", () => app.getPath("userData"));
    ipcMain.handle("show-message-box", (_, options) =>
      dialog.showMessageBox(this.mainWindow!, options)
    );

    // Store operations
    ipcMain.handle("store-get", (_, key) => this.store.get(key));
    ipcMain.handle("store-set", (_, key, value) => this.store.set(key, value));
    ipcMain.handle("store-delete", (_, key) => this.store.delete(key));

    // Log operations
    ipcMain.handle("get-logs", () => this.tallyCore.getLogs());
    ipcMain.handle("clear-logs", () => this.tallyCore.clearLogs());

    // Startup management
    ipcMain.handle("enable-startup", async () => {
      const success = await this.enableStartupWithWindows();
      return { success };
    });

    ipcMain.handle("disable-startup", async () => {
      const success = await this.disableStartupWithWindows();
      return { success };
    });

    ipcMain.handle("is-startup-enabled", async () => {
      const enabled = await this.isStartupEnabled();
      return { enabled };
    });

    // Listen for sync progress updates
    this.tallyCore.on("sync-progress", (data: any) => {
      this.mainWindow?.webContents.send("sync-progress", data);
    });

    this.tallyCore.on("sync-complete", (data: any) => {
      this.mainWindow?.webContents.send("sync-complete", data);
    });

    this.tallyCore.on("sync-error", (error: any) => {
      this.mainWindow?.webContents.send("sync-error", error);
    });

    this.tallyCore.on("log-message", (message: any) => {
      this.mainWindow?.webContents.send("log-message", message);
    });
  }

  private setupAutoUpdater() {
    if (!this.isDev) {
      autoUpdater.checkForUpdatesAndNotify();

      autoUpdater.on("update-available", () => {
        dialog.showMessageBox(this.mainWindow!, {
          type: "info",
          title: "Update Available",
          message:
            "A new version is available. It will be downloaded in the background.",
          buttons: ["OK"],
        });
      });

      autoUpdater.on("update-downloaded", () => {
        dialog
          .showMessageBox(this.mainWindow!, {
            type: "info",
            title: "Update Ready",
            message:
              "Update downloaded. The application will restart to apply the update.",
            buttons: ["Restart Now", "Later"],
          })
          .then((result) => {
            if (result.response === 0) {
              autoUpdater.quitAndInstall();
            }
          });
      });
    }
  }

  // Menu handlers
  private handleNewConfiguration() {
    this.mainWindow?.webContents.send("menu-new-configuration");
  }

  private handleOpenConfiguration() {
    this.mainWindow?.webContents.send("menu-open-configuration");
  }

  private handleSaveConfiguration() {
    this.mainWindow?.webContents.send("menu-save-configuration");
  }

  private handleImportConfiguration() {
    this.mainWindow?.webContents.send("menu-import-configuration");
  }

  private handleExportConfiguration() {
    this.mainWindow?.webContents.send("menu-export-configuration");
  }

  private handleStartSync() {
    this.mainWindow?.webContents.send("menu-start-sync");
  }

  private handleStopSync() {
    this.mainWindow?.webContents.send("menu-stop-sync");
  }

  private handleTestDatabaseConnection() {
    this.mainWindow?.webContents.send("menu-test-database");
  }

  private handleTestTallyConnection() {
    this.mainWindow?.webContents.send("menu-test-tally");
  }

  private handleDatabaseStructure() {
    this.mainWindow?.webContents.send("menu-database-structure");
  }

  private handleViewReports() {
    this.mainWindow?.webContents.send("menu-view-reports");
  }

  private handleClearLogs() {
    this.mainWindow?.webContents.send("menu-clear-logs");
  }

  private handleSettings() {
    this.mainWindow?.webContents.send("menu-settings");
  }

  private showAboutDialog() {
    dialog.showMessageBox(this.mainWindow!, {
      type: "info",
      title: "About Tally Database Loader",
      message: "Tally Database Loader",
      detail: `Version: ${app.getVersion()}\n\nA desktop application for synchronizing Tally Prime data with various databases.\n\n© 2024 Tally Database Loader Team`,
    });
  }

  // Startup Management Methods
  private async enableStartupWithWindows(): Promise<boolean> {
    if (platform() !== "win32") {
      return false;
    }

    try {
      const appPath = app.getPath("exe");
      const startupKey =
        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
      const appName = "TallyDatabaseLoader";

      const command = `reg add "${startupKey}" /v "${appName}" /t REG_SZ /d "${appPath}" /f`;

      return new Promise((resolve) => {
        exec(command, (error) => {
          if (error) {
            console.error("Failed to enable startup:", error);
            resolve(false);
          } else {
            console.log("Startup enabled successfully");
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("Error enabling startup:", error);
      return false;
    }
  }

  private async disableStartupWithWindows(): Promise<boolean> {
    if (platform() !== "win32") {
      return false;
    }

    try {
      const startupKey =
        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
      const appName = "TallyDatabaseLoader";

      const command = `reg delete "${startupKey}" /v "${appName}" /f`;

      return new Promise((resolve) => {
        exec(command, (error) => {
          if (error) {
            console.error("Failed to disable startup:", error);
            resolve(false);
          } else {
            console.log("Startup disabled successfully");
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error("Error disabling startup:", error);
      return false;
    }
  }

  private async isStartupEnabled(): Promise<boolean> {
    if (platform() !== "win32") {
      return false;
    }

    try {
      const startupKey =
        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
      const appName = "TallyDatabaseLoader";

      const command = `reg query "${startupKey}" /v "${appName}"`;

      return new Promise((resolve) => {
        exec(command, (error) => {
          resolve(!error);
        });
      });
    } catch (error) {
      return false;
    }
  }

  private async checkAndStartBackgroundSync(): Promise<void> {
    try {
      const config = this.tallyCore.loadConfiguration();
      const hasBackgroundSync =
        config.tally.frequency > 0 && config.tally.sync === "incremental";
      const startMinimized = this.store.get("startMinimized") === true;

      if (hasBackgroundSync) {
        // Start background sync automatically
        await this.tallyCore.startSync(config);

        // Hide window if it exists or if start minimized is enabled
        if (this.mainWindow && (startMinimized || hasBackgroundSync)) {
          this.mainWindow.hide();
        }

        // Show notification
        this.showBackgroundNotification();

        console.log(
          `Background sync started with frequency: ${config.tally.frequency} minutes`
        );
      } else if (startMinimized && this.mainWindow) {
        // If no background sync but start minimized is enabled, just hide the window
        this.mainWindow.hide();
      }
    } catch (error) {
      console.error("Error starting background sync:", error);
    }
  }

  private createTray() {
    // Create tray icon for system tray
    const iconPath = path.join(__dirname, "assets/icon.png");
    const trayIcon = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 16, height: 16 });

    this.tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show App",
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
          } else {
            this.createWindow();
          }
        },
      },
      {
        label: "Sync Status",
        click: () => {
          const status = this.tallyCore.getSyncStatus();
          const message = status.isRunning
            ? `Sync in progress: ${status.message}`
            : `Ready - Last sync: ${status.endTime || "Never"}`;

          if (this.mainWindow) {
            this.mainWindow.webContents.send("show-toast", {
              title: "Sync Status",
              message: message,
              type: "info",
            });
          }
        },
      },
      { type: "separator" },
      {
        label: "Startup Settings",
        submenu: [
          {
            label: "Enable Auto-Start",
            click: async () => {
              const result = await this.enableStartupWithWindows();
              if (result) {
                if (this.tray) {
                  this.tray.displayBalloon({
                    title: "Startup Enabled",
                    content: "App will start automatically with Windows",
                    icon: nativeImage.createFromPath(
                      path.join(__dirname, "assets/icon.png")
                    ),
                  });
                }
              }
            },
          },
          {
            label: "Disable Auto-Start",
            click: async () => {
              const result = await this.disableStartupWithWindows();
              if (result) {
                if (this.tray) {
                  this.tray.displayBalloon({
                    title: "Startup Disabled",
                    content: "App will no longer start automatically",
                    icon: nativeImage.createFromPath(
                      path.join(__dirname, "assets/icon.png")
                    ),
                  });
                }
              }
            },
          },
        ],
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
    this.tray.setToolTip("Tally Database Loader - Background Sync Active");

    // Double-click to show window
    this.tray.on("double-click", () => {
      if (this.mainWindow) {
        this.mainWindow.show();
        this.mainWindow.focus();
      } else {
        this.createWindow();
      }
    });
  }

  private showBackgroundNotification() {
    // Show notification that app is running in background
    const config = this.tallyCore.loadConfiguration();

    if (this.tray) {
      this.tray.displayBalloon({
        title: "Tally Database Loader",
        content: `Background sync enabled. Syncing every ${config.tally.frequency} minutes. Right-click tray icon for options.`,
        icon: nativeImage.createFromPath(
          path.join(__dirname, "assets/icon.png")
        ),
      });
    }
  }
}

// Create the application instance
new TallyDatabaseLoaderApp();
