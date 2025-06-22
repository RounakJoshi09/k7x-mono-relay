"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose the API to the renderer process
const api = {
    // Configuration
    loadConfig: () => electron_1.ipcRenderer.invoke("load-config"),
    saveConfig: (config) => electron_1.ipcRenderer.invoke("save-config", config),
    validateConfig: (config) => electron_1.ipcRenderer.invoke("validate-config", config),
    // Database operations
    testDatabaseConnection: (config) => electron_1.ipcRenderer.invoke("test-database-connection", config),
    getDatabaseStructure: () => electron_1.ipcRenderer.invoke("get-database-structure"),
    // Tally operations
    testTallyConnection: (config) => electron_1.ipcRenderer.invoke("test-tally-connection", config),
    getTallyCompanies: (config) => electron_1.ipcRenderer.invoke("get-tally-companies", config),
    // Sync operations
    startSync: (config) => electron_1.ipcRenderer.invoke("start-sync", config),
    stopSync: () => electron_1.ipcRenderer.invoke("stop-sync"),
    getSyncStatus: () => electron_1.ipcRenderer.invoke("get-sync-status"),
    isSyncRunning: () => electron_1.ipcRenderer.invoke("is-sync-running"),
    // File operations
    selectFile: (options) => electron_1.ipcRenderer.invoke("select-file", options),
    saveFile: (options) => electron_1.ipcRenderer.invoke("save-file", options),
    // Application operations
    getAppVersion: () => electron_1.ipcRenderer.invoke("get-app-version"),
    getUserDataPath: () => electron_1.ipcRenderer.invoke("get-user-data-path"),
    showMessageBox: (options) => electron_1.ipcRenderer.invoke("show-message-box", options),
    // Store operations
    storeGet: (key) => electron_1.ipcRenderer.invoke("store-get", key),
    storeSet: (key, value) => electron_1.ipcRenderer.invoke("store-set", key, value),
    storeDelete: (key) => electron_1.ipcRenderer.invoke("store-delete", key),
    // Log operations
    getLogs: () => electron_1.ipcRenderer.invoke("get-logs"),
    clearLogs: () => electron_1.ipcRenderer.invoke("clear-logs"),
    // Startup management
    enableStartup: () => electron_1.ipcRenderer.invoke("enable-startup"),
    disableStartup: () => electron_1.ipcRenderer.invoke("disable-startup"),
    isStartupEnabled: () => electron_1.ipcRenderer.invoke("is-startup-enabled"),
    // Event listeners
    onSyncProgress: (callback) => {
        electron_1.ipcRenderer.on("sync-progress", (_, data) => callback(data));
    },
    onSyncComplete: (callback) => {
        electron_1.ipcRenderer.on("sync-complete", (_, data) => callback(data));
    },
    onSyncError: (callback) => {
        electron_1.ipcRenderer.on("sync-error", (_, error) => callback(error));
    },
    onLogMessage: (callback) => {
        electron_1.ipcRenderer.on("log-message", (_, message) => callback(message));
    },
    onMenuAction: (callback) => {
        // Listen to all menu actions
        const menuActions = [
            "menu-new-configuration",
            "menu-open-configuration",
            "menu-save-configuration",
            "menu-import-configuration",
            "menu-export-configuration",
            "menu-start-sync",
            "menu-stop-sync",
            "menu-test-database",
            "menu-test-tally",
            "menu-database-structure",
            "menu-view-reports",
            "menu-clear-logs",
            "menu-settings",
        ];
        menuActions.forEach((action) => {
            electron_1.ipcRenderer.on(action, () => callback(action));
        });
    },
    // Remove event listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
};
// Expose the API to the window object
electron_1.contextBridge.exposeInMainWorld("tallyAPI", api);
