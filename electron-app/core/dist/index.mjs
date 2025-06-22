import process from "process";
import { initialize as initializeTally, getInstance as getTallyInstance, } from "./tally.mjs";
import { initialize as initializeDatabase, getInstance as getDatabaseInstance, } from "./database.mjs";
import { logger } from "./logger.mjs";
let isSyncRunning = false;
let lastMasterAlterId = 0;
let lastTransactionAlterId = 0;
function parseCommandlineOptions() {
    let retval = new Map();
    try {
        let lstArgs = process.argv;
        if (lstArgs.length > 2 && lstArgs.length % 2 == 0)
            for (let i = 2; i < lstArgs.length; i += 2) {
                let argName = lstArgs[i];
                let argValue = lstArgs[i + 1];
                if (/^--\w+-\w+$/g.test(argName))
                    retval.set(argName.substr(2), argValue);
            }
    }
    catch (err) {
        logger.logError("index.substituteTDLParameters()", err);
    }
    return retval;
}
function getConfigPath() {
    // Look for --config-path argument
    const args = process.argv;
    for (let i = 2; i < args.length; i += 2) {
        if (args[i] === "--config-path" && i + 1 < args.length) {
            return args[i + 1];
        }
    }
    return "./config.json"; // fallback
}
function invokeImport() {
    return new Promise(async (resolve) => {
        try {
            isSyncRunning = true;
            await getTallyInstance().importData();
            logger.logMessage("Import completed successfully [%s]", new Date().toLocaleString());
        }
        catch (err) {
            logger.logMessage("Error in importing data\r\nPlease check error-log.txt file for detailed errors [%s]", new Date().toLocaleString());
        }
        finally {
            isSyncRunning = false;
            resolve();
        }
    });
}
// Get config path and initialize modules
const configPath = getConfigPath();
initializeDatabase(configPath);
initializeTally(configPath);
//Update commandline overrides to configuration options
let cmdConfig = parseCommandlineOptions();
getDatabaseInstance().updateCommandlineConfig(cmdConfig);
getTallyInstance().updateCommandlineConfig(cmdConfig);
if (getTallyInstance().config.frequency <= 0) {
    // on-demand sync
    await invokeImport();
    logger.closeStreams();
}
else {
    // continuous sync
    const triggerImport = async () => {
        try {
            // skip if sync is already running (wait for next trigger)
            if (!isSyncRunning) {
                await getTallyInstance().updateLastAlterId();
                let isDataChanged = !(lastMasterAlterId == getTallyInstance().lastAlterIdMaster &&
                    lastTransactionAlterId == getTallyInstance().lastAlterIdTransaction);
                if (isDataChanged) {
                    // process only if data is changed
                    //update local variable copy of last alter ID
                    lastMasterAlterId = getTallyInstance().lastAlterIdMaster;
                    lastTransactionAlterId = getTallyInstance().lastAlterIdTransaction;
                    await invokeImport();
                }
                else {
                    logger.logMessage("No change in Tally data found [%s]", new Date().toLocaleString());
                }
            }
        }
        catch (err) {
            if (typeof err == "string" && err.endsWith("is closed in Tally")) {
                logger.logMessage(err + " [%s]", new Date().toLocaleString());
            }
            else {
                throw err;
            }
        }
    };
    if (!getTallyInstance().config.company) {
        // do not process continuous sync for blank company
        logger.logMessage("Continuous sync requires Tally company name to be specified in config.json");
    }
    else {
        // go ahead with continuous sync
        setInterval(async () => await triggerImport(), getTallyInstance().config.frequency * 60000);
        await triggerImport();
    }
}
//# sourceMappingURL=index.mjs.map