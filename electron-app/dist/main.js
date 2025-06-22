"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const electron_store_1 = __importDefault(require("electron-store"));
const core_bridge_1 = require("./core-bridge");
// For Windows startup functionality
const child_process_1 = require("child_process");
const os_1 = require("os");
class TallyDatabaseLoaderApp {
    constructor() {
        this.mainWindow = null;
        this.tray = null;
        this.isQuitting = false;
        this.isDev = process.argv.includes("--dev");
        this.store = new electron_store_1.default();
        this.tallyCore = new core_bridge_1.TallyDatabaseCore();
        this.setupApp();
        this.setupIPC();
        this.setupAutoUpdater();
    }
    setupApp() {
        // This method will be called when Electron has finished initialization
        electron_1.app.whenReady().then(async () => {
            this.createWindow();
            this.createMenu();
            this.createTray();
            // Check if background sync should start automatically
            await this.checkAndStartBackgroundSync();
            electron_1.app.on("activate", () => {
                if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });
        electron_1.app.on("window-all-closed", () => {
            // Don't quit the app when all windows are closed
            // Allow it to continue running in background for scheduled sync
            if (process.platform === "darwin" && !this.isQuitting) {
                // On macOS, apps typically stay running even when all windows are closed
                return;
            }
            // On Windows/Linux, only quit if not running background sync
            const config = this.tallyCore.loadConfiguration();
            const hasBackgroundSync = config.tally.frequency > 0 && config.tally.sync === "incremental";
            if (!hasBackgroundSync || this.isQuitting) {
                electron_1.app.quit();
            }
        });
        electron_1.app.on("before-quit", (event) => {
            const config = this.tallyCore.loadConfiguration();
            const hasBackgroundSync = config.tally.frequency > 0 && config.tally.sync === "incremental";
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
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
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
        }
        else {
            this.mainWindow.loadFile(path.join(__dirname, "renderer/index.html"));
        }
        this.mainWindow.once("ready-to-show", () => {
            this.mainWindow?.show();
        });
        this.mainWindow.on("close", (event) => {
            const config = this.tallyCore.loadConfiguration();
            const hasBackgroundSync = config.tally.frequency > 0 && config.tally.sync === "incremental";
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
            electron_1.shell.openExternal(url);
            return { action: "deny" };
        });
    }
    createMenu() {
        const template = [
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
                        click: () => electron_1.app.quit(),
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
                        click: () => electron_1.shell.openExternal("https://github.com/your-repo/tally-database-loader/docs"),
                    },
                    {
                        label: "Check for Updates",
                        click: () => electron_updater_1.autoUpdater.checkForUpdatesAndNotify(),
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
        const menu = electron_1.Menu.buildFromTemplate(template);
        electron_1.Menu.setApplicationMenu(menu);
    }
    setupIPC() {
        // Configuration management
        electron_1.ipcMain.handle("load-config", () => this.tallyCore.loadConfiguration());
        electron_1.ipcMain.handle("save-config", (_, config) => this.tallyCore.saveConfiguration(config));
        electron_1.ipcMain.handle("validate-config", (_, config) => this.tallyCore.validateConfiguration(config));
        electron_1.ipcMain.handle("restore-config", (_, backupPath) => this.tallyCore.restoreConfigurationFromBackup(backupPath));
        // Database operations
        electron_1.ipcMain.handle("test-database-connection", (_, config) => this.tallyCore.testDatabaseConnection(config));
        electron_1.ipcMain.handle("get-database-structure", () => this.tallyCore.getDatabaseStructure());
        // Tally operations
        electron_1.ipcMain.handle("test-tally-connection", (_, config) => this.tallyCore.testTallyConnection(config));
        electron_1.ipcMain.handle("get-tally-companies", (_, config) => this.tallyCore.getTallyCompanies(config));
        // Sync operations
        electron_1.ipcMain.handle("start-sync", async (_, config) => {
            try {
                return await this.tallyCore.startSync(config);
            }
            catch (error) {
                // Handle the specific case where sync is already running
                if (error instanceof Error &&
                    error.message === "Sync is already running") {
                    return { error: "Sync is already running" };
                }
                // Re-throw other errors
                throw error;
            }
        });
        electron_1.ipcMain.handle("stop-sync", () => this.tallyCore.stopSync());
        electron_1.ipcMain.handle("get-sync-status", () => this.tallyCore.getSyncStatus());
        electron_1.ipcMain.handle("is-sync-running", () => this.tallyCore.isSyncRunning());
        // File operations
        electron_1.ipcMain.handle("select-file", async (_, options) => {
            const result = await electron_1.dialog.showOpenDialog(this.mainWindow, options);
            return result.filePaths[0];
        });
        electron_1.ipcMain.handle("save-file", async (_, options) => {
            const result = await electron_1.dialog.showSaveDialog(this.mainWindow, options);
            return result.filePath;
        });
        electron_1.ipcMain.handle("write-file", async (_, filePath, content) => {
            try {
                fs.writeFileSync(filePath, content, "utf8");
            }
            catch (error) {
                throw new Error(`Failed to write file: ${error}`);
            }
        });
        electron_1.ipcMain.handle("read-file", async (_, filePath) => {
            try {
                return fs.readFileSync(filePath, "utf8");
            }
            catch (error) {
                throw new Error(`Failed to read file: ${error}`);
            }
        });
        // Application operations
        electron_1.ipcMain.handle("get-app-version", () => electron_1.app.getVersion());
        electron_1.ipcMain.handle("get-user-data-path", () => electron_1.app.getPath("userData"));
        electron_1.ipcMain.handle("show-message-box", (_, options) => electron_1.dialog.showMessageBox(this.mainWindow, options));
        // Store operations
        electron_1.ipcMain.handle("store-get", (_, key) => this.store.get(key));
        electron_1.ipcMain.handle("store-set", (_, key, value) => this.store.set(key, value));
        electron_1.ipcMain.handle("store-delete", (_, key) => this.store.delete(key));
        // Log operations
        electron_1.ipcMain.handle("get-logs", () => this.tallyCore.getLogs());
        electron_1.ipcMain.handle("clear-logs", () => this.tallyCore.clearLogs());
        // Startup management
        electron_1.ipcMain.handle("enable-startup", async () => {
            const success = await this.enableStartupWithWindows();
            return { success };
        });
        electron_1.ipcMain.handle("disable-startup", async () => {
            const success = await this.disableStartupWithWindows();
            return { success };
        });
        electron_1.ipcMain.handle("is-startup-enabled", async () => {
            const enabled = await this.isStartupEnabled();
            return { enabled };
        });
        // Listen for sync progress updates
        this.tallyCore.on("sync-progress", (data) => {
            this.mainWindow?.webContents.send("sync-progress", data);
        });
        this.tallyCore.on("sync-complete", (data) => {
            this.mainWindow?.webContents.send("sync-complete", data);
        });
        this.tallyCore.on("sync-error", (error) => {
            this.mainWindow?.webContents.send("sync-error", error);
        });
        this.tallyCore.on("log-message", (message) => {
            this.mainWindow?.webContents.send("log-message", message);
        });
    }
    setupAutoUpdater() {
        if (!this.isDev) {
            electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
            electron_updater_1.autoUpdater.on("update-available", () => {
                electron_1.dialog.showMessageBox(this.mainWindow, {
                    type: "info",
                    title: "Update Available",
                    message: "A new version is available. It will be downloaded in the background.",
                    buttons: ["OK"],
                });
            });
            electron_updater_1.autoUpdater.on("update-downloaded", () => {
                electron_1.dialog
                    .showMessageBox(this.mainWindow, {
                    type: "info",
                    title: "Update Ready",
                    message: "Update downloaded. The application will restart to apply the update.",
                    buttons: ["Restart Now", "Later"],
                })
                    .then((result) => {
                    if (result.response === 0) {
                        electron_updater_1.autoUpdater.quitAndInstall();
                    }
                });
            });
        }
    }
    // Menu handlers
    handleNewConfiguration() {
        this.mainWindow?.webContents.send("menu-new-configuration");
    }
    handleOpenConfiguration() {
        this.mainWindow?.webContents.send("menu-open-configuration");
    }
    handleSaveConfiguration() {
        this.mainWindow?.webContents.send("menu-save-configuration");
    }
    handleImportConfiguration() {
        this.mainWindow?.webContents.send("menu-import-configuration");
    }
    handleExportConfiguration() {
        this.mainWindow?.webContents.send("menu-export-configuration");
    }
    handleStartSync() {
        this.mainWindow?.webContents.send("menu-start-sync");
    }
    handleStopSync() {
        this.mainWindow?.webContents.send("menu-stop-sync");
    }
    handleTestDatabaseConnection() {
        this.mainWindow?.webContents.send("menu-test-database");
    }
    handleTestTallyConnection() {
        this.mainWindow?.webContents.send("menu-test-tally");
    }
    handleDatabaseStructure() {
        this.mainWindow?.webContents.send("menu-database-structure");
    }
    handleViewReports() {
        this.mainWindow?.webContents.send("menu-view-reports");
    }
    handleClearLogs() {
        this.mainWindow?.webContents.send("menu-clear-logs");
    }
    handleSettings() {
        this.mainWindow?.webContents.send("menu-settings");
    }
    showAboutDialog() {
        electron_1.dialog.showMessageBox(this.mainWindow, {
            type: "info",
            title: "About Tally Database Loader",
            message: "Tally Database Loader",
            detail: `Version: ${electron_1.app.getVersion()}\n\nA desktop application for synchronizing Tally Prime data with various databases.\n\n© 2024 Tally Database Loader Team`,
        });
    }
    // Startup Management Methods
    async enableStartupWithWindows() {
        if ((0, os_1.platform)() !== "win32") {
            return false;
        }
        try {
            const appPath = electron_1.app.getPath("exe");
            const startupKey = "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
            const appName = "TallyDatabaseLoader";
            const command = `reg add "${startupKey}" /v "${appName}" /t REG_SZ /d "${appPath}" /f`;
            return new Promise((resolve) => {
                (0, child_process_1.exec)(command, (error) => {
                    if (error) {
                        console.error("Failed to enable startup:", error);
                        resolve(false);
                    }
                    else {
                        console.log("Startup enabled successfully");
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            console.error("Error enabling startup:", error);
            return false;
        }
    }
    async disableStartupWithWindows() {
        if ((0, os_1.platform)() !== "win32") {
            return false;
        }
        try {
            const startupKey = "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
            const appName = "TallyDatabaseLoader";
            const command = `reg delete "${startupKey}" /v "${appName}" /f`;
            return new Promise((resolve) => {
                (0, child_process_1.exec)(command, (error) => {
                    if (error) {
                        console.error("Failed to disable startup:", error);
                        resolve(false);
                    }
                    else {
                        console.log("Startup disabled successfully");
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            console.error("Error disabling startup:", error);
            return false;
        }
    }
    async isStartupEnabled() {
        if ((0, os_1.platform)() !== "win32") {
            return false;
        }
        try {
            const startupKey = "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
            const appName = "TallyDatabaseLoader";
            const command = `reg query "${startupKey}" /v "${appName}"`;
            return new Promise((resolve) => {
                (0, child_process_1.exec)(command, (error) => {
                    resolve(!error);
                });
            });
        }
        catch (error) {
            return false;
        }
    }
    async checkAndStartBackgroundSync() {
        try {
            const config = this.tallyCore.loadConfiguration();
            const hasBackgroundSync = config.tally.frequency > 0 && config.tally.sync === "incremental";
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
                console.log(`Background sync started with frequency: ${config.tally.frequency} minutes`);
            }
            else if (startMinimized && this.mainWindow) {
                // If no background sync but start minimized is enabled, just hide the window
                this.mainWindow.hide();
            }
        }
        catch (error) {
            console.error("Error starting background sync:", error);
        }
    }
    createTray() {
        // Create tray icon for system tray
        const iconPath = path.join(__dirname, "assets/icon.png");
        const trayIcon = electron_1.nativeImage
            .createFromPath(iconPath)
            .resize({ width: 16, height: 16 });
        this.tray = new electron_1.Tray(trayIcon);
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: "Show App",
                click: () => {
                    if (this.mainWindow) {
                        this.mainWindow.show();
                        this.mainWindow.focus();
                    }
                    else {
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
                                        icon: electron_1.nativeImage.createFromPath(path.join(__dirname, "assets/icon.png")),
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
                                        icon: electron_1.nativeImage.createFromPath(path.join(__dirname, "assets/icon.png")),
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
                    electron_1.app.quit();
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
            }
            else {
                this.createWindow();
            }
        });
    }
    showBackgroundNotification() {
        // Show notification that app is running in background
        const config = this.tallyCore.loadConfiguration();
        if (this.tray) {
            this.tray.displayBalloon({
                title: "Tally Database Loader",
                content: `Background sync enabled. Syncing every ${config.tally.frequency} minutes. Right-click tray icon for options.`,
                icon: electron_1.nativeImage.createFromPath(path.join(__dirname, "assets/icon.png")),
            });
        }
    }
}
// Create the application instance
new TallyDatabaseLoaderApp();
