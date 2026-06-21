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
      ? path.join(process.resourcesPath, "config-default.json")
      : path.join(__dirname, "../config-default.json");

    const userDataPath = path.join(app.getPath("userData"), "config.json");

    // Copy default config to user data if it doesn't exist
    if (!fs.existsSync(userDataPath) && fs.existsSync(resourcesPath)) {
      fs.copyFileSync(resourcesPath, userDataPath);
    }

    return userDataPath;
  }

  private ensureConfigExists(): void {
    if (!fs.existsSync(this.configPath)) {
      // Try to load default config from resources
      const resourcesPath = app.isPackaged
        ? path.join(process.resourcesPath, "config-default.json")
        : path.join(__dirname, "../config-default.json");

      if (fs.existsSync(resourcesPath)) {
        // Try to copy to primary path first
        try {
          fs.copyFileSync(resourcesPath, this.configPath);
          return;
        } catch (error) {
          this.emit("log-message", `Could not write to primary path: ${error}`);
        }
      }

      // If primary path failed, try fallback paths
      const fallbackPaths = this.getConfigSavePaths().slice(1); // Skip primary path
      for (const fallbackPath of fallbackPaths) {
        try {
          // Ensure directory exists
          const fallbackDir = path.dirname(fallbackPath);
          if (!fs.existsSync(fallbackDir)) {
            fs.mkdirSync(fallbackDir, { recursive: true });
          }

          if (fs.existsSync(resourcesPath)) {
            // Copy from resources
            fs.copyFileSync(resourcesPath, fallbackPath);
          } else {
            // Fallback to hardcoded default if resources file doesn't exist
            const defaultConfig: AppConfig = {
              database: {
                technology: "mysql",
                server: "localhost",
                port: 3306,
                ssl: false,
                schema: "tally",
                username: "root",
                password: "",
                loadmethod: "insert",
                ssh_tunnel: {
                  enabled: false,
                  host: "",
                  port: 22,
                  username: "",
                  password: "",
                  privateKey: "",
                  localPort: 3307,
                  remoteHost: "localhost",
                  remotePort: 3306,
                },
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

            fs.writeFileSync(
              fallbackPath,
              JSON.stringify(defaultConfig, null, 2)
            );
          }

          // Update config path to the successful fallback
          this.configPath = fallbackPath;
          this.emit("log-message", `Created default configuration in fallback location: ${fallbackPath}`);
          return;
        } catch (error) {
          this.emit("log-message", `Failed to create config in ${fallbackPath}: ${error}`);
          continue;
        }
      }

      // If all fallbacks failed, throw an error
      throw new Error("Could not create configuration file in any location");
    }
  }

  public loadConfiguration(): AppConfig {
    try {
      // First try to load from the primary path
      if (!fs.existsSync(this.configPath)) {
        this.emit(
          "log-message",
          "Configuration file not found in primary location, checking fallback locations"
        );

        // Try to find existing config in fallback locations
        const fallbackPaths = this.getConfigSavePaths().slice(1); // Skip primary path
        let foundConfig = false;

        for (const fallbackPath of fallbackPaths) {
          if (fs.existsSync(fallbackPath)) {
            this.emit("log-message", `Found configuration in fallback location: ${fallbackPath}`);
            this.configPath = fallbackPath;
            foundConfig = true;
            break;
          }
        }

        if (!foundConfig) {
          this.emit(
            "log-message",
            "Configuration file not found, creating default configuration"
          );
          this.ensureConfigExists();
        }
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
        try {
          fs.copyFileSync(this.configPath, backupPath);
          this.emit(
            "log-message",
            `Corrupted configuration backed up to: ${backupPath}`
          );
        } catch (backupError) {
          this.emit("log-message", `Warning: Could not create backup: ${backupError}`);
        }

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

      // Try multiple paths for saving configuration
      const savePaths = this.getConfigSavePaths();
      let saved = false;
      let lastError: Error | null = null;

      for (const savePath of savePaths) {
        try {
          // Ensure the directory exists
          const configDir = path.dirname(savePath);
          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
          }

          // Create backup before saving (only for the primary path)
          if (savePath === this.configPath && fs.existsSync(this.configPath)) {
            const backupPath = this.configPath + `.backup.${Date.now()}`;
            try {
              fs.copyFileSync(this.configPath, backupPath);
              this.emit("log-message", `Configuration backed up to: ${backupPath}`);
            } catch (backupError) {
              this.emit("log-message", `Warning: Could not create backup: ${backupError}`);
            }
          }

          // Save the configuration
          fs.writeFileSync(savePath, JSON.stringify(config, null, 2));

          // Update the config path if we used a fallback
          if (savePath !== this.configPath) {
            this.configPath = savePath;
            this.emit("log-message", `Configuration saved to fallback path: ${savePath}`);
          } else {
            this.emit("log-message", "Configuration saved successfully");
          }

          saved = true;
          break;
        } catch (error) {
          lastError = error as Error;
          this.emit("log-message", `Failed to save to ${savePath}: ${error}`);
          continue;
        }
      }

      if (!saved) {
        throw new Error(`Failed to save configuration to any location. Last error: ${lastError?.message}`);
      }
    } catch (error) {
      this.emit("log-message", `Error saving configuration: ${error}`);
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  private getConfigSavePaths(): string[] {
    const paths: string[] = [];

    // Primary path (original userData path)
    paths.push(this.configPath);

    // Fallback paths for Windows permission issues
    if (process.platform === 'win32') {
      // Try user's Documents folder
      const documentsPath = path.join(app.getPath("documents"), "Tally Database Loader", "config.json");
      paths.push(documentsPath);

      // Try user's Desktop
      const desktopPath = path.join(app.getPath("desktop"), "Tally Database Loader", "config.json");
      paths.push(desktopPath);

      // Try application directory (if writable)
      const appDataPath = path.join(process.cwd(), "config.json");
      paths.push(appDataPath);

      // Try temp directory as last resort
      const tempPath = path.join(app.getPath("temp"), "tally-database-loader", "config.json");
      paths.push(tempPath);
    } else {
      // For non-Windows platforms, try home directory
      const homePath = path.join(process.env.HOME || process.env.USERPROFILE || "", ".tally-database-loader", "config.json");
      paths.push(homePath);
    }

    return paths;
  }

  public resetToDefaults(): void {
    try {
      // Create backup before resetting
      if (fs.existsSync(this.configPath)) {
        const backupPath = this.configPath + `.backup.${Date.now()}`;
        fs.copyFileSync(this.configPath, backupPath);
        this.emit(
          "log-message",
          `Current configuration backed up to: ${backupPath}`
        );
      }

      // Reset to default configuration
      this.ensureConfigExists();
      this.emit("log-message", "Configuration reset to defaults successfully");
    } catch (error) {
      this.emit("log-message", `Error resetting configuration: ${error}`);
      throw new Error(`Failed to reset configuration: ${error}`);
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

        const corePath = this.getCorePath();
        const testProcess = childProcess.fork(
          path.join(corePath, "database.mjs"),
          ["--test-connection", "--config", tempConfigPath]
        );

        let output = "";
        testProcess.on("message", (msg: any) => {
          output += msg.toString();
        });

        testProcess.on("exit", (code) => {
          fs.unlinkSync(tempConfigPath);

          if (code === 0) {
            resolve({
              success: true,
              message: "Database connection successful",
            });
          } else {
            resolve({
              success: false,
              message: output || "Database connection failed",
            });
          }
        });

        testProcess.on("error", (error) => {
          resolve({ success: false, message: error.message });
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
        const corePath = this.getCorePath();
        const testProcess = childProcess.fork(
          path.join(corePath, "tally.mjs"),
          [
            "--test-connection",
            "--tally-server",
            config.tally.server,
            "--tally-port",
            config.tally.port.toString(),
          ]
        );

        let output = "";
        testProcess.on("message", (msg: any) => {
          output += msg.toString();
        });

        testProcess.on("exit", (code) => {
          if (code === 0) {
            resolve({ success: true, message: "Tally connection successful" });
          } else {
            resolve({
              success: false,
              message: output || "Tally connection failed",
            });
          }
        });

        testProcess.on("error", (error) => {
          resolve({ success: false, message: error.message });
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

      // Enhanced debugging information
      this.emit("log-message", `Core path: ${corePath}`);
      this.emit("log-message", `Arguments: ${JSON.stringify(args)}`);

      // Check if core files exist
      const indexPath = path.join(corePath, "index.mjs");
      if (!fs.existsSync(indexPath)) {
        throw new Error(`Core sync file not found: ${indexPath}`);
      }

      this.emit("log-message", `Starting sync process: ${indexPath}`);

      this.syncProcess = childProcess.fork(indexPath, args, {
        stdio: ["pipe", "pipe", "pipe", "ipc"],
        env: {
          ...process.env,
          NODE_ENV: app.isPackaged ? "production" : "development",
          // Set NODE_PATH to include the node_modules in resources for packaged app
          NODE_PATH: app.isPackaged
            ? path.join(process.resourcesPath, "node_modules")
            : path.join(process.cwd(), "node_modules"),
        },
      });

      // Capture stdout and stderr for debugging
      let stdoutData = "";
      let stderrData = "";

      if (this.syncProcess.stdout) {
        this.syncProcess.stdout.on("data", (data) => {
          stdoutData += data.toString();
          this.emit("log-message", `STDOUT: ${data.toString().trim()}`);
        });
      }

      if (this.syncProcess.stderr) {
        this.syncProcess.stderr.on("data", (data) => {
          stderrData += data.toString();
          this.emit("log-message", `STDERR: ${data.toString().trim()}`);
        });
      }

      this.syncProcess.on("message", (msg: any) => {
        this.handleSyncMessage(msg);
      });

      this.syncProcess.on("exit", (code, signal) => {
        this.syncStatus.isRunning = false;
        this.syncStatus.endTime = new Date();

        if (code === 0) {
          this.syncStatus.message = "Sync completed successfully";
          this.emit("sync-complete", this.syncStatus);
        } else {
          this.syncStatus.message = "Sync failed";
          this.syncStatus.error = `Process exited with code ${code}${signal ? `, signal: ${signal}` : ""
            }`;

          // Enhanced error information
          if (stderrData) {
            this.syncStatus.error += `\nSTDERR: ${stderrData}`;
          }
          if (stdoutData) {
            this.syncStatus.error += `\nSTDOUT: ${stdoutData}`;
          }

          this.emit("sync-error", this.syncStatus);
        }

        this.syncProcess = null;
      });

      this.syncProcess.on("error", (error) => {
        this.syncStatus.isRunning = false;
        this.syncStatus.message = "Sync error";
        this.syncStatus.error = `Process error: ${error.message}\nSTDERR: ${stderrData}\nSTDOUT: ${stdoutData}`;
        this.emit("sync-error", this.syncStatus);
        this.syncProcess = null;
      });

      this.emit("sync-progress", this.syncStatus);
    } catch (error) {
      this.syncStatus.isRunning = false;
      this.syncStatus.error =
        error instanceof Error ? error.message : "Unknown error";
      this.emit("log-message", `Sync startup error: ${this.syncStatus.error}`);
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

  /**
   * Returns the CREATE TABLE script for the selected database technology and sync mode.
   * Scripts live under platform/<technology>/ with a fallback to the root-level MSSQL scripts.
   */
  public getDatabaseStructure(
    technology?: string,
    incremental?: boolean
  ): string {
    try {
      let savedConfig: AppConfig | null = null;
      try {
        if (fs.existsSync(this.configPath)) {
          savedConfig = JSON.parse(
            fs.readFileSync(this.configPath, "utf8")
          ) as AppConfig;
        }
      } catch {
        savedConfig = null;
      }

      const tech = (
        technology ||
        savedConfig?.database?.technology ||
        "mssql"
      )
        .toLowerCase()
        .trim();
      const isIncremental =
        incremental === true ||
        (incremental !== false && savedConfig?.tally?.sync === "incremental");
      const fileName = isIncremental
        ? "database-structure-incremental.sql"
        : "database-structure.sql";

      // Map UI/config technology names to platform folder names
      const platformFolderMap: Record<string, string> = {
        mssql: "mssql",
        mysql: "mysql",
        postgres: "postgresql",
        postgresql: "postgresql",
        bigquery: "google-bigquery",
      };
      const platformFolder = platformFolderMap[tech] || "mssql";

      const candidatePaths: string[] = [];
      if (app.isPackaged) {
        candidatePaths.push(
          path.join(process.resourcesPath, "platform", platformFolder, fileName)
        );
        candidatePaths.push(path.join(process.resourcesPath, fileName));
      } else {
        candidatePaths.push(
          path.join(__dirname, "../../platform", platformFolder, fileName)
        );
        candidatePaths.push(path.join(__dirname, "../../", fileName));
      }

      for (const structurePath of candidatePaths) {
        if (fs.existsSync(structurePath)) {
          return fs.readFileSync(structurePath, "utf8");
        }
      }

      throw new Error(
        `Database structure file not found for technology "${tech}" (incremental=${isIncremental}). Tried: ${candidatePaths.join(", ")}`
      );
    } catch (error) {
      throw new Error(`Failed to load database structure: ${error}`);
    }
  }

  /**
   * Lists supported database technologies with default ports and connection hints.
   */
  public getSupportedDatabases(): Array<{
    technology: string;
    label: string;
    defaultPort: number;
    defaultLoadMethod: string;
    requiresCredentials: boolean;
    platformFolder: string;
  }> {
    return [
      {
        technology: "mysql",
        label: "MySQL / MariaDB",
        defaultPort: 3306,
        defaultLoadMethod: "insert",
        requiresCredentials: true,
        platformFolder: "mysql",
      },
      {
        technology: "postgres",
        label: "PostgreSQL",
        defaultPort: 5432,
        defaultLoadMethod: "file",
        requiresCredentials: true,
        platformFolder: "postgresql",
      },
      {
        technology: "mssql",
        label: "Microsoft SQL Server",
        defaultPort: 1433,
        defaultLoadMethod: "file",
        requiresCredentials: true,
        platformFolder: "mssql",
      },
      {
        technology: "bigquery",
        label: "Google BigQuery",
        defaultPort: 0,
        defaultLoadMethod: "file",
        requiresCredentials: false,
        platformFolder: "google-bigquery",
      },
      {
        technology: "adls",
        label: "Azure Data Lake Storage",
        defaultPort: 0,
        defaultLoadMethod: "file",
        requiresCredentials: false,
        platformFolder: "",
      },
      {
        technology: "csv",
        label: "CSV Files",
        defaultPort: 0,
        defaultLoadMethod: "file",
        requiresCredentials: false,
        platformFolder: "",
      },
    ];
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

    // Tally args - use full path for definition file
    const definitionPath = app.isPackaged
      ? path.join(process.resourcesPath, config.tally.definition)
      : path.join(process.cwd(), config.tally.definition);
    args.push("--tally-definition", definitionPath);
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
