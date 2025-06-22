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
const electron_store_1 = __importDefault(require("electron-store"));
const core_bridge_1 = require("./core-bridge");
class TallyDatabaseLoaderApp {
    constructor() {
        this.mainWindow = null;
        this.isDev = process.argv.includes("--dev");
        this.store = new electron_store_1.default();
        this.tallyCore = new core_bridge_1.TallyDatabaseCore();
        this.setupApp();
        this.setupIPC();
        this.setupAutoUpdater();
    }
    setupApp() {
        // This method will be called when Electron has finished initialization
        electron_1.app.whenReady().then(() => {
            this.createWindow();
            this.createMenu();
            electron_1.app.on("activate", () => {
                if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });
        electron_1.app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                electron_1.app.quit();
            }
        });
        electron_1.app.on("before-quit", () => {
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
        // Database operations
        electron_1.ipcMain.handle("test-database-connection", (_, config) => this.tallyCore.testDatabaseConnection(config));
        electron_1.ipcMain.handle("get-database-structure", () => this.tallyCore.getDatabaseStructure());
        // Tally operations
        electron_1.ipcMain.handle("test-tally-connection", (_, config) => this.tallyCore.testTallyConnection(config));
        electron_1.ipcMain.handle("get-tally-companies", (_, config) => this.tallyCore.getTallyCompanies(config));
        // Sync operations
        electron_1.ipcMain.handle("start-sync", (_, config) => this.tallyCore.startSync(config));
        electron_1.ipcMain.handle("stop-sync", () => this.tallyCore.stopSync());
        electron_1.ipcMain.handle("get-sync-status", () => this.tallyCore.getSyncStatus());
        // File operations
        electron_1.ipcMain.handle("select-file", async (_, options) => {
            const result = await electron_1.dialog.showOpenDialog(this.mainWindow, options);
            return result.filePaths[0];
        });
        electron_1.ipcMain.handle("save-file", async (_, options) => {
            const result = await electron_1.dialog.showSaveDialog(this.mainWindow, options);
            return result.filePath;
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
}
// Create the application instance
new TallyDatabaseLoaderApp();
