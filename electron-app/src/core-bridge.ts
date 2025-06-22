import { EventEmitter } from "events";
import * as path from "path";
import * as fs from "fs";
import { app } from "electron";
import * as childProcess from "child_process";

// Types
interface DatabaseConfig {
  technology: string;
  server: string;
  port: number;
  ssl: boolean;
  schema: string;
  username: string;
  password: string;
  loadmethod: string;
  ssh_tunnel?: {
    enabled: boolean;
    host: string;
    port: number;
    username: string;
    password: string;
    privateKey: string;
    localPort: number;
    remoteHost: string;
    remotePort: number;
  };
}

interface TallyConfig {
  definition: string;
  server: string;
  port: number;
  company: string;
  fromdate: string;
  todate: string;
  frequency: number;
  sync: string;
}

interface AppConfig {
  database: DatabaseConfig;
  tally: TallyConfig;
}

interface SyncStatus {
  isRunning: boolean;
  progress: number;
  currentTable: string;
  message: string;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export class TallyDatabaseCore extends EventEmitter {
  private configPath: string;
  private syncProcess: childProcess.ChildProcess | null = null;
  private syncStatus: SyncStatus = {
    isRunning: false,
    progress: 0,
    currentTable: "",
    message: "Ready",
  };

  constructor() {
    super();
    this.configPath = this.getConfigPath();
    this.ensureConfigExists();
  }

  private getConfigPath(): string {
    const resourcesPath = app.isPackaged
      ? path.join(process.resourcesPath, "config.json")
      : path.join(__dirname, "../config.json");

    const userDataPath = path.join(app.getPath("userData"), "config.json");

    // Copy default config to user data if it doesn't exist
    if (!fs.existsSync(userDataPath) && fs.existsSync(resourcesPath)) {
      fs.copyFileSync(resourcesPath, userDataPath);
    }

    return userDataPath;
  }

  private ensureConfigExists(): void {
    if (!fs.existsSync(this.configPath)) {
      const defaultConfig: AppConfig = {
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

  public loadConfiguration(): AppConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.emit(
          "log-message",
          "Configuration file not found, creating default configuration"
        );
        this.ensureConfigExists();
      }

      const configData = fs.readFileSync(this.configPath, "utf8");
      let config: AppConfig;

      try {
        config = JSON.parse(configData);
      } catch (parseError) {
        // Configuration file is corrupted, create backup and generate new one
        this.emit(
          "log-message",
          "Configuration file is corrupted, creating backup and generating new configuration"
        );

        const backupPath = this.configPath + `.backup.${Date.now()}`;
        fs.copyFileSync(this.configPath, backupPath);
        this.emit(
          "log-message",
          `Corrupted configuration backed up to: ${backupPath}`
        );

        // Generate new default configuration
        this.ensureConfigExists();
        config = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
      }

      // Validate the loaded configuration structure
      if (!config.database || !config.tally) {
        this.emit(
          "log-message",
          "Invalid configuration structure, generating new default configuration"
        );
        this.ensureConfigExists();
        config = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
      }

      this.emit("log-message", "Configuration loaded successfully");
      return config;
    } catch (error) {
      this.emit("log-message", `Error loading configuration: ${error}`);
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  public saveConfiguration(config: AppConfig): void {
    try {
      // Validate configuration before saving
      if (!config.database || !config.tally) {
        throw new Error("Invalid configuration structure");
      }

      // Ensure the directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Create backup before saving
      if (fs.existsSync(this.configPath)) {
        const backupPath = this.configPath + `.backup.${Date.now()}`;
        fs.copyFileSync(this.configPath, backupPath);
        this.emit("log-message", `Configuration backed up to: ${backupPath}`);
      }

      // Save the configuration
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      this.emit("log-message", "Configuration saved successfully");
    } catch (error) {
      this.emit("log-message", `Error saving configuration: ${error}`);
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  public restoreConfigurationFromBackup(backupPath: string): boolean {
    try {
      if (!fs.existsSync(backupPath)) {
        this.emit("log-message", `Backup file not found: ${backupPath}`);
        return false;
      }

      // Validate the backup file
      const backupData = fs.readFileSync(backupPath, "utf8");
      const backupConfig = JSON.parse(backupData);

      if (!backupConfig.database || !backupConfig.tally) {
        this.emit("log-message", "Invalid backup configuration structure");
        return false;
      }

      // Restore the configuration
      fs.copyFileSync(backupPath, this.configPath);
      this.emit(
        "log-message",
        `Configuration restored from backup: ${backupPath}`
      );
      return true;
    } catch (error) {
      this.emit(
        "log-message",
        `Error restoring configuration from backup: ${error}`
      );
      return false;
    }
  }

  public validateConfiguration(config: AppConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

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
      if (
        !config.database.ssh_tunnel.password &&
        !config.database.ssh_tunnel.privateKey
      ) {
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

  public async testDatabaseConnection(
    config: AppConfig
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      try {
        // Create a temporary config file for testing
        const tempConfigPath = path.join(
          app.getPath("temp"),
          "test-config.json"
        );
        fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

        // Import the database module and test connection directly
        const { database } = require(path.join(
          this.getCorePath(),
          "database.mjs"
        ));
        const dbInstance = new database(tempConfigPath);

        dbInstance
          .testConnection()
          .then((result: { success: boolean; message: string }) => {
            fs.unlinkSync(tempConfigPath);
            resolve(result);
          })
          .catch((error: any) => {
            fs.unlinkSync(tempConfigPath);
            resolve({
              success: false,
              message: `Connection test failed: ${error.message || error}`,
            });
          });
      } catch (error) {
        resolve({
          success: false,
          message: `Connection test failed: ${error}`,
        });
      }
    });
  }

  public async testTallyConnection(
    config: AppConfig
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      try {
        // Create a temporary config file for testing
        const tempConfigPath = path.join(
          app.getPath("temp"),
          "test-tally-config.json"
        );
        fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));

        // Import the tally module and test connection directly
        const { tally } = require(path.join(this.getCorePath(), "tally.mjs"));
        const tallyInstance = new tally(tempConfigPath);

        tallyInstance
          .testConnection()
          .then((result: { success: boolean; message: string }) => {
            fs.unlinkSync(tempConfigPath);
            resolve(result);
          })
          .catch((error: any) => {
            fs.unlinkSync(tempConfigPath);
            resolve({
              success: false,
              message: `Connection test failed: ${error.message || error}`,
            });
          });
      } catch (error) {
        resolve({
          success: false,
          message: `Connection test failed: ${error}`,
        });
      }
    });
  }

  public async getTallyCompanies(config: AppConfig): Promise<string[]> {
    return new Promise((resolve) => {
      try {
        const corePath = this.getCorePath();
        const listProcess = childProcess.fork(
          path.join(corePath, "tally.mjs"),
          [
            "--list-companies",
            "--tally-server",
            config.tally.server,
            "--tally-port",
            config.tally.port.toString(),
          ]
        );

        let companies: string[] = [];
        listProcess.on("message", (msg: any) => {
          try {
            const data = JSON.parse(msg.toString());
            companies = data.companies || [];
          } catch {
            companies = [];
          }
        });

        listProcess.on("exit", () => {
          resolve(companies);
        });

        listProcess.on("error", () => {
          resolve([]);
        });
      } catch {
        resolve([]);
      }
    });
  }

  public async startSync(config: AppConfig): Promise<void> {
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

      this.syncProcess = childProcess.fork(
        path.join(corePath, "index.mjs"),
        args
      );

      this.syncProcess.on("message", (msg: any) => {
        this.handleSyncMessage(msg);
      });

      this.syncProcess.on("exit", (code) => {
        this.syncStatus.isRunning = false;
        this.syncStatus.endTime = new Date();

        if (code === 0) {
          this.syncStatus.message = "Sync completed successfully";
          this.emit("sync-complete", this.syncStatus);
        } else {
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
    } catch (error) {
      this.syncStatus.isRunning = false;
      this.syncStatus.error =
        error instanceof Error ? error.message : "Unknown error";
      throw error;
    }
  }

  public stopSync(): void {
    if (this.syncProcess) {
      this.syncProcess.kill();
      this.syncProcess = null;
    }

    this.syncStatus.isRunning = false;
    this.syncStatus.message = "Sync stopped";
    this.emit("sync-progress", this.syncStatus);
  }

  public getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  public isSyncRunning(): boolean {
    return this.syncStatus.isRunning;
  }

  public getDatabaseStructure(): string {
    try {
      const structurePath = app.isPackaged
        ? path.join(process.resourcesPath, "database-structure.sql")
        : path.join(__dirname, "../../database-structure.sql");

      return fs.readFileSync(structurePath, "utf8");
    } catch (error) {
      throw new Error(`Failed to load database structure: ${error}`);
    }
  }

  public getLogs(): string {
    try {
      const logPath = path.join(app.getPath("userData"), "import-log.txt");
      if (fs.existsSync(logPath)) {
        return fs.readFileSync(logPath, "utf8");
      }
      return "";
    } catch (error) {
      return `Error reading logs: ${error}`;
    }
  }

  public clearLogs(): void {
    try {
      const logPath = path.join(app.getPath("userData"), "import-log.txt");
      const errorLogPath = path.join(app.getPath("userData"), "error-log.txt");

      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
      }
      if (fs.existsSync(errorLogPath)) {
        fs.unlinkSync(errorLogPath);
      }

      this.emit("log-message", "Logs cleared");
    } catch (error) {
      this.emit("log-message", `Error clearing logs: ${error}`);
    }
  }

  public cleanup(): void {
    if (this.syncProcess) {
      this.syncProcess.kill();
    }
  }

  private getCorePath(): string {
    return app.isPackaged
      ? path.join(process.resourcesPath, "core")
      : path.join(__dirname, "../core/dist");
  }

  private configToArgs(config: AppConfig): string[] {
    const args: string[] = [];

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

  private handleSyncMessage(msg: any): void {
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
    } catch (error) {
      this.emit("log-message", `Error processing sync message: ${error}`);
    }
  }
}
