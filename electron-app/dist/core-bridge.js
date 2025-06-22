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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TallyDatabaseCore = void 0;
const events_1 = require("events");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const electron_1 = require("electron");
const childProcess = __importStar(require("child_process"));
class TallyDatabaseCore extends events_1.EventEmitter {
    constructor() {
        super();
        this.syncProcess = null;
        this.syncStatus = {
            isRunning: false,
            progress: 0,
            currentTable: "",
            message: "Ready",
        };
        this.configPath = this.getConfigPath();
        this.ensureConfigExists();
    }
    getConfigPath() {
        const resourcesPath = electron_1.app.isPackaged
            ? path.join(process.resourcesPath, "config.json")
            : path.join(__dirname, "../config.json");
        const userDataPath = path.join(electron_1.app.getPath("userData"), "config.json");
        // Copy default config to user data if it doesn't exist
        if (!fs.existsSync(userDataPath) && fs.existsSync(resourcesPath)) {
            fs.copyFileSync(resourcesPath, userDataPath);
        }
        return userDataPath;
    }
    ensureConfigExists() {
        if (!fs.existsSync(this.configPath)) {
            const defaultConfig = {
                database: {
                    technology: "mysql",
                    server: "127.0.0.1",
                    port: 3306,
                    ssl: false,
                    schema: "tally",
                    username: "root",
                    password: "",
                    loadmethod: "insert",
                },
                tally: {
                    definition: "tally-export-config.yaml",
                    server: "localhost",
                    port: 9000,
                    company: "",
                    fromdate: "auto",
                    todate: "auto",
                    frequency: 0,
                    sync: "full",
                },
            };
            fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
        }
    }
    loadConfiguration() {
        try {
            const configData = fs.readFileSync(this.configPath, "utf8");
            return JSON.parse(configData);
        }
        catch (error) {
            this.emit("log-message", `Error loading configuration: ${error}`);
            throw new Error(`Failed to load configuration: ${error}`);
        }
    }
    saveConfiguration(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            this.emit("log-message", "Configuration saved successfully");
        }
        catch (error) {
            this.emit("log-message", `Error saving configuration: ${error}`);
            throw new Error(`Failed to save configuration: ${error}`);
        }
    }
    validateConfiguration(config) {
        const errors = [];
        // Database validation
        if (!config.database.server) {
            errors.push("Database server is required");
        }
        if (config.database.port <= 0 || config.database.port > 65535) {
            errors.push("Invalid database port");
        }
        if (!config.database.schema) {
            errors.push("Database schema is required");
        }
        if (["mssql", "mysql", "postgres"].includes(config.database.technology)) {
            if (!config.database.username) {
                errors.push("Database username is required");
            }
            if (!config.database.password) {
                errors.push("Database password is required");
            }
        }
        // SSH Tunnel validation
        if (config.database.ssh_tunnel?.enabled) {
            if (!config.database.ssh_tunnel.host) {
                errors.push("SSH host is required");
            }
            if (!config.database.ssh_tunnel.username) {
                errors.push("SSH username is required");
            }
            if (!config.database.ssh_tunnel.password &&
                !config.database.ssh_tunnel.privateKey) {
                errors.push("SSH password or private key is required");
            }
        }
        // Tally validation
        if (!config.tally.server) {
            errors.push("Tally server is required");
        }
        if (config.tally.port <= 0 || config.tally.port > 65535) {
            errors.push("Invalid Tally port");
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    async testDatabaseConnection(config) {
        return new Promise((resolve) => {
            try {
                // Create a temporary config file for testing
                const tempConfigPath = path.join(electron_1.app.getPath("temp"), "test-config.json");
                fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));
                const corePath = this.getCorePath();
                const testProcess = childProcess.fork(path.join(corePath, "database.mjs"), ["--test-connection", "--config", tempConfigPath]);
                let output = "";
                testProcess.on("message", (msg) => {
                    output += msg.toString();
                });
                testProcess.on("exit", (code) => {
                    fs.unlinkSync(tempConfigPath);
                    if (code === 0) {
                        resolve({
                            success: true,
                            message: "Database connection successful",
                        });
                    }
                    else {
                        resolve({
                            success: false,
                            message: output || "Database connection failed",
                        });
                    }
                });
                testProcess.on("error", (error) => {
                    resolve({ success: false, message: error.message });
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    message: `Connection test failed: ${error}`,
                });
            }
        });
    }
    async testTallyConnection(config) {
        return new Promise((resolve) => {
            try {
                const corePath = this.getCorePath();
                const testProcess = childProcess.fork(path.join(corePath, "tally.mjs"), [
                    "--test-connection",
                    "--tally-server",
                    config.tally.server,
                    "--tally-port",
                    config.tally.port.toString(),
                ]);
                let output = "";
                testProcess.on("message", (msg) => {
                    output += msg.toString();
                });
                testProcess.on("exit", (code) => {
                    if (code === 0) {
                        resolve({ success: true, message: "Tally connection successful" });
                    }
                    else {
                        resolve({
                            success: false,
                            message: output || "Tally connection failed",
                        });
                    }
                });
                testProcess.on("error", (error) => {
                    resolve({ success: false, message: error.message });
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    message: `Connection test failed: ${error}`,
                });
            }
        });
    }
    async getTallyCompanies(config) {
        return new Promise((resolve) => {
            try {
                const corePath = this.getCorePath();
                const listProcess = childProcess.fork(path.join(corePath, "tally.mjs"), [
                    "--list-companies",
                    "--tally-server",
                    config.tally.server,
                    "--tally-port",
                    config.tally.port.toString(),
                ]);
                let companies = [];
                listProcess.on("message", (msg) => {
                    try {
                        const data = JSON.parse(msg.toString());
                        companies = data.companies || [];
                    }
                    catch {
                        companies = [];
                    }
                });
                listProcess.on("exit", () => {
                    resolve(companies);
                });
                listProcess.on("error", () => {
                    resolve([]);
                });
            }
            catch {
                resolve([]);
            }
        });
    }
    async startSync(config) {
        if (this.syncStatus.isRunning) {
            throw new Error("Sync is already running");
        }
        try {
            // Save current config
            this.saveConfiguration(config);
            // Start sync process
            this.syncStatus = {
                isRunning: true,
                progress: 0,
                currentTable: "",
                message: "Starting sync...",
                startTime: new Date(),
            };
            const corePath = this.getCorePath();
            const args = this.configToArgs(config);
            this.syncProcess = childProcess.fork(path.join(corePath, "index.mjs"), args);
            this.syncProcess.on("message", (msg) => {
                this.handleSyncMessage(msg);
            });
            this.syncProcess.on("exit", (code) => {
                this.syncStatus.isRunning = false;
                this.syncStatus.endTime = new Date();
                if (code === 0) {
                    this.syncStatus.message = "Sync completed successfully";
                    this.emit("sync-complete", this.syncStatus);
                }
                else {
                    this.syncStatus.message = "Sync failed";
                    this.syncStatus.error = `Process exited with code ${code}`;
                    this.emit("sync-error", this.syncStatus);
                }
                this.syncProcess = null;
            });
            this.syncProcess.on("error", (error) => {
                this.syncStatus.isRunning = false;
                this.syncStatus.message = "Sync error";
                this.syncStatus.error = error.message;
                this.emit("sync-error", this.syncStatus);
                this.syncProcess = null;
            });
            this.emit("sync-progress", this.syncStatus);
        }
        catch (error) {
            this.syncStatus.isRunning = false;
            this.syncStatus.error =
                error instanceof Error ? error.message : "Unknown error";
            throw error;
        }
    }
    stopSync() {
        if (this.syncProcess) {
            this.syncProcess.kill();
            this.syncProcess = null;
        }
        this.syncStatus.isRunning = false;
        this.syncStatus.message = "Sync stopped";
        this.emit("sync-progress", this.syncStatus);
    }
    getSyncStatus() {
        return { ...this.syncStatus };
    }
    getDatabaseStructure() {
        try {
            const structurePath = electron_1.app.isPackaged
                ? path.join(process.resourcesPath, "database-structure.sql")
                : path.join(__dirname, "../../database-structure.sql");
            return fs.readFileSync(structurePath, "utf8");
        }
        catch (error) {
            throw new Error(`Failed to load database structure: ${error}`);
        }
    }
    getLogs() {
        try {
            const logPath = path.join(electron_1.app.getPath("userData"), "import-log.txt");
            if (fs.existsSync(logPath)) {
                return fs.readFileSync(logPath, "utf8");
            }
            return "";
        }
        catch (error) {
            return `Error reading logs: ${error}`;
        }
    }
    clearLogs() {
        try {
            const logPath = path.join(electron_1.app.getPath("userData"), "import-log.txt");
            const errorLogPath = path.join(electron_1.app.getPath("userData"), "error-log.txt");
            if (fs.existsSync(logPath)) {
                fs.unlinkSync(logPath);
            }
            if (fs.existsSync(errorLogPath)) {
                fs.unlinkSync(errorLogPath);
            }
            this.emit("log-message", "Logs cleared");
        }
        catch (error) {
            this.emit("log-message", `Error clearing logs: ${error}`);
        }
    }
    cleanup() {
        if (this.syncProcess) {
            this.syncProcess.kill();
        }
    }
    getCorePath() {
        return electron_1.app.isPackaged
            ? path.join(process.resourcesPath, "core")
            : path.join(__dirname, "../core/dist");
    }
    configToArgs(config) {
        const args = [];
        // Add config path argument
        args.push("--config-path", this.configPath);
        // Database args
        args.push("--database-technology", config.database.technology);
        args.push("--database-server", config.database.server);
        args.push("--database-port", config.database.port.toString());
        args.push("--database-ssl", config.database.ssl.toString());
        args.push("--database-schema", config.database.schema);
        args.push("--database-username", config.database.username);
        args.push("--database-password", config.database.password);
        args.push("--database-loadmethod", config.database.loadmethod);
        // Tally args
        args.push("--tally-definition", config.tally.definition);
        args.push("--tally-server", config.tally.server);
        args.push("--tally-port", config.tally.port.toString());
        args.push("--tally-company", config.tally.company);
        args.push("--tally-fromdate", config.tally.fromdate);
        args.push("--tally-todate", config.tally.todate);
        args.push("--tally-frequency", config.tally.frequency.toString());
        args.push("--tally-sync", config.tally.sync);
        return args;
    }
    handleSyncMessage(msg) {
        try {
            const message = typeof msg === "string" ? msg : msg.toString();
            // Parse sync progress messages
            if (message.includes("syncing table")) {
                const match = message.match(/syncing table (\w+)/);
                if (match) {
                    this.syncStatus.currentTable = match[1];
                }
            }
            if (message.includes("progress:")) {
                const match = message.match(/progress: (\d+)%/);
                if (match) {
                    this.syncStatus.progress = parseInt(match[1]);
                }
            }
            this.syncStatus.message = message;
            this.emit("sync-progress", this.syncStatus);
            this.emit("log-message", message);
        }
        catch (error) {
            this.emit("log-message", `Error processing sync message: ${error}`);
        }
    }
}
exports.TallyDatabaseCore = TallyDatabaseCore;
