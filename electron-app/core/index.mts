import process from "process";
import fs from "fs";
import {
  tally,
  initialize as initializeTally,
  getInstance as getTallyInstance,
} from "./tally.mjs";
import {
  database,
  initialize as initializeDatabase,
  getInstance as getDatabaseInstance,
} from "./database.mjs";
import { logger } from "./logger.mjs";

let isSyncRunning = false;
let lastMasterAlterId = 0;
let lastTransactionAlterId = 0;

// Enhanced error handling for module loading
function safeImport(modulePath: string, moduleName: string) {
  try {
    logger.logMessage(`Loading module: ${moduleName}`);
    return require(modulePath);
  } catch (error) {
    logger.logMessage(`Failed to load module ${moduleName}: ${error}`);
    throw error;
  }
}

function parseCommandlineOptions(): Map<string, string> {
  let retval = new Map<string, string>();
  try {
    let lstArgs = process.argv;

    if (lstArgs.length > 2 && lstArgs.length % 2 == 0)
      for (let i = 2; i < lstArgs.length; i += 2) {
        let argName = lstArgs[i];
        let argValue = lstArgs[i + 1];
        if (/^--\w+-\w+$/g.test(argName))
          retval.set(argName.substr(2), argValue);
      }
  } catch (err) {
    logger.logError("index.substituteTDLParameters()", err);
  }
  return retval;
}

function getConfigPath(): string {
  // Look for --config-path argument
  const args = process.argv;
  for (let i = 2; i < args.length; i += 2) {
    if (args[i] === "--config-path" && i + 1 < args.length) {
      return args[i + 1];
    }
  }
  return "./config.json"; // fallback
}

function invokeImport(): Promise<void> {
  return new Promise<void>(async (resolve) => {
    try {
      isSyncRunning = true;
      logger.logMessage("Starting import process...");

      await getTallyInstance().importData();
      logger.logMessage(
        "Import completed successfully [%s]",
        new Date().toLocaleString()
      );
    } catch (err) {
      logger.logMessage(
        "Error in importing data\r\nPlease check error-log.txt file for detailed errors [%s]",
        new Date().toLocaleString()
      );
      logger.logError("invokeImport", err);

      // Send error details to parent process
      if (process.send) {
        process.send(
          `ERROR: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } finally {
      isSyncRunning = false;
      resolve();
    }
  });
}

// Main execution with enhanced error handling
async function main() {
  try {
    logger.logMessage("Tally Database Loader Core starting...");
    logger.logMessage(`Node.js version: ${process.version}`);
    logger.logMessage(`Platform: ${process.platform}`);
    logger.logMessage(`Architecture: ${process.arch}`);
    logger.logMessage(`Working directory: ${process.cwd()}`);
    logger.logMessage(`Arguments: ${JSON.stringify(process.argv)}`);

    // Get config path and initialize modules
    const configPath = getConfigPath();
    logger.logMessage(`Config path: ${configPath}`);

    // Check if config file exists
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    logger.logMessage("Initializing database module...");
    initializeDatabase(configPath);

    logger.logMessage("Initializing tally module...");
    initializeTally(configPath);

    //Update commandline overrides to configuration options
    let cmdConfig = parseCommandlineOptions();
    logger.logMessage(
      `Command line config: ${JSON.stringify(Object.fromEntries(cmdConfig))}`
    );

    getDatabaseInstance().updateCommandlineConfig(cmdConfig);
    getTallyInstance().updateCommandlineConfig(cmdConfig);

    if (getTallyInstance().config.frequency <= 0) {
      // on-demand sync
      logger.logMessage("Starting on-demand sync...");
      await invokeImport();
      logger.closeStreams();
    } else {
      // continuous sync
      logger.logMessage(
        `Starting continuous sync with frequency: ${
          getTallyInstance().config.frequency
        } minutes`
      );

      const triggerImport = async () => {
        try {
          // skip if sync is already running (wait for next trigger)
          if (!isSyncRunning) {
            await getTallyInstance().updateLastAlterId();

            let isDataChanged = !(
              lastMasterAlterId == getTallyInstance().lastAlterIdMaster &&
              lastTransactionAlterId ==
                getTallyInstance().lastAlterIdTransaction
            );
            if (isDataChanged) {
              // process only if data is changed
              //update local variable copy of last alter ID
              lastMasterAlterId = getTallyInstance().lastAlterIdMaster;
              lastTransactionAlterId =
                getTallyInstance().lastAlterIdTransaction;
              await invokeImport();
            } else {
              logger.logMessage(
                "No change in Tally data found [%s]",
                new Date().toLocaleString()
              );
            }
          }
        } catch (err) {
          if (typeof err == "string" && err.endsWith("is closed in Tally")) {
            logger.logMessage(err + " [%s]", new Date().toLocaleString());
          } else {
            logger.logError("triggerImport", err);
            throw err;
          }
        }
      };

      if (!getTallyInstance().config.company) {
        // do not process continuous sync for blank company
        logger.logMessage(
          "Continuous sync requires Tally company name to be specified in config.json"
        );
      } else {
        // go ahead with continuous sync
        setInterval(
          async () => await triggerImport(),
          getTallyInstance().config.frequency * 60000
        );
        await triggerImport();
      }
    }
  } catch (error) {
    logger.logError("main", error);
    logger.logMessage(
      `Fatal error: ${error instanceof Error ? error.message : String(error)}`
    );

    // Send error to parent process
    if (process.send) {
      process.send(
        `FATAL_ERROR: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Exit with error code
    process.exit(1);
  }
}

// Start the main process
main().catch((error) => {
  console.error("Unhandled error in main:", error);
  process.exit(1);
});
