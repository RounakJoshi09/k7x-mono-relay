import { contextBridge, ipcRenderer } from "electron";

// Define the API interface
interface TallyDatabaseAPI {
  // Configuration
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<void>;
  validateConfig: (
    config: any
  ) => Promise<{ isValid: boolean; errors: string[] }>;

  // Database operations
  testDatabaseConnection: (
    config: any
  ) => Promise<{ success: boolean; message: string }>;
  getDatabaseStructure: () => Promise<string>;

  // Tally operations
  testTallyConnection: (
    config: any
  ) => Promise<{ success: boolean; message: string }>;
  getTallyCompanies: (config: any) => Promise<string[]>;

  // Sync operations
  startSync: (config: any) => Promise<void>;
  stopSync: () => Promise<void>;
  getSyncStatus: () => Promise<any>;

  // File operations
  selectFile: (options: any) => Promise<string>;
  saveFile: (options: any) => Promise<string>;

  // Application operations
  getAppVersion: () => Promise<string>;
  getUserDataPath: () => Promise<string>;
  showMessageBox: (options: any) => Promise<any>;

  // Store operations
  storeGet: (key: string) => Promise<any>;
  storeSet: (key: string, value: any) => Promise<void>;
  storeDelete: (key: string) => Promise<void>;

  // Log operations
  getLogs: () => Promise<string>;
  clearLogs: () => Promise<void>;

  // Event listeners
  onSyncProgress: (callback: (data: any) => void) => void;
  onSyncComplete: (callback: (data: any) => void) => void;
  onSyncError: (callback: (error: any) => void) => void;
  onLogMessage: (callback: (message: string) => void) => void;
  onMenuAction: (callback: (action: string) => void) => void;

  // Remove event listeners
  removeAllListeners: (channel: string) => void;
}

// Expose the API to the renderer process
const api: TallyDatabaseAPI = {
  // Configuration
  loadConfig: () => ipcRenderer.invoke("load-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  validateConfig: (config) => ipcRenderer.invoke("validate-config", config),

  // Database operations
  testDatabaseConnection: (config) =>
    ipcRenderer.invoke("test-database-connection", config),
  getDatabaseStructure: () => ipcRenderer.invoke("get-database-structure"),

  // Tally operations
  testTallyConnection: (config) =>
    ipcRenderer.invoke("test-tally-connection", config),
  getTallyCompanies: (config) =>
    ipcRenderer.invoke("get-tally-companies", config),

  // Sync operations
  startSync: (config) => ipcRenderer.invoke("start-sync", config),
  stopSync: () => ipcRenderer.invoke("stop-sync"),
  getSyncStatus: () => ipcRenderer.invoke("get-sync-status"),

  // File operations
  selectFile: (options) => ipcRenderer.invoke("select-file", options),
  saveFile: (options) => ipcRenderer.invoke("save-file", options),

  // Application operations
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),
  showMessageBox: (options) => ipcRenderer.invoke("show-message-box", options),

  // Store operations
  storeGet: (key) => ipcRenderer.invoke("store-get", key),
  storeSet: (key, value) => ipcRenderer.invoke("store-set", key, value),
  storeDelete: (key) => ipcRenderer.invoke("store-delete", key),

  // Log operations
  getLogs: () => ipcRenderer.invoke("get-logs"),
  clearLogs: () => ipcRenderer.invoke("clear-logs"),

  // Event listeners
  onSyncProgress: (callback) => {
    ipcRenderer.on("sync-progress", (_, data) => callback(data));
  },
  onSyncComplete: (callback) => {
    ipcRenderer.on("sync-complete", (_, data) => callback(data));
  },
  onSyncError: (callback) => {
    ipcRenderer.on("sync-error", (_, error) => callback(error));
  },
  onLogMessage: (callback) => {
    ipcRenderer.on("log-message", (_, message) => callback(message));
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
      ipcRenderer.on(action, () => callback(action));
    });
  },

  // Remove event listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

// Expose the API to the window object
contextBridge.exposeInMainWorld("tallyAPI", api);
