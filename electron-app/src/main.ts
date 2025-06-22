import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from "electron";
import { autoUpdater } from "electron-updater";
import * as path from "path";
import * as fs from "fs";
import Store from "electron-store";
import { TallyDatabaseCore } from "./core-bridge";

class TallyDatabaseLoaderApp {
  private mainWindow: BrowserWindow | null = null;
  private store: Store;
  private tallyCore: TallyDatabaseCore;
  private isDev: boolean;

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
    app.whenReady().then(() => {
      this.createWindow();
      this.createMenu();

      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        }
      });
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });

    app.on("before-quit", () => {
      this.tallyCore.cleanup();
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, "../assets/icon.png"),
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
      this.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    }

    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow?.show();
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
    ipcMain.handle("start-sync", (_, config) =>
      this.tallyCore.startSync(config)
    );
    ipcMain.handle("stop-sync", () => this.tallyCore.stopSync());
    ipcMain.handle("get-sync-status", () => this.tallyCore.getSyncStatus());

    // File operations
    ipcMain.handle("select-file", async (_, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow!, options);
      return result.filePaths[0];
    });

    ipcMain.handle("save-file", async (_, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options);
      return result.filePath;
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
}

// Create the application instance
new TallyDatabaseLoaderApp();
