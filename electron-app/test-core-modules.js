#!/usr/bin/env node

/**
 * Test script to debug core module loading issues
 * Run this script to test if the core modules can be loaded properly
 */

const path = require("path");
const fs = require("fs");
const { fileURLToPath, pathToFileURL } = require("url");
const { spawn } = require("child_process");

console.log("=== Tally Database Loader Core Module Test ===");
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Working directory: ${process.cwd()}`);
console.log("");

// Helper function to convert Windows paths to proper file:// URLs
function toFileURL(filePath) {
  // Convert Windows backslashes to forward slashes
  const normalizedPath = path.resolve(filePath).replace(/\\/g, "/");

  // On Windows, ensure we have a proper file:// URL
  if (process.platform === "win32") {
    // Remove drive letter and add file:// protocol
    const driveLetter = normalizedPath.match(/^([A-Za-z]:)/);
    if (driveLetter) {
      return `file:///${normalizedPath.substring(2)}`;
    }
  }

  return `file://${normalizedPath}`;
}

// Test core path resolution
function testCorePath() {
  console.log("Testing core path resolution...");

  const possiblePaths = [
    path.join(process.cwd(), "core", "dist"),
    path.join(process.cwd(), "dist", "core", "dist"),
    path.join(process.resourcesPath || "", "core"),
    path.join(__dirname, "core", "dist"),
    path.join(__dirname, "dist", "core", "dist"),
  ];

  for (const corePath of possiblePaths) {
    console.log(`  Checking: ${corePath}`);
    if (fs.existsSync(corePath)) {
      console.log(`  ✓ Found core directory: ${corePath}`);

      // Check for key files
      const keyFiles = [
        "index.mjs",
        "tally.mjs",
        "database.mjs",
        "logger.mjs",
        "utility.mjs",
      ];
      for (const file of keyFiles) {
        const filePath = path.join(corePath, file);
        if (fs.existsSync(filePath)) {
          console.log(`    ✓ Found: ${file}`);
        } else {
          console.log(`    ✗ Missing: ${file}`);
        }
      }
      return corePath;
    } else {
      console.log(`  ✗ Not found: ${corePath}`);
    }
  }

  console.log("  ✗ No core directory found!");
  return null;
}

// Test module loading by executing from within the core directory
async function testModuleLoadingFromCoreDir(corePath) {
  if (!corePath) {
    console.log("\nSkipping module loading test - no core path found");
    return;
  }

  console.log("\nTesting module loading from core directory...");

  // Create a simple test script that will run from within the core directory
  const testScript = `
import { logger } from './logger.mjs';
import { database } from './database.mjs';
import { tally } from './tally.mjs';

console.log('=== Core Module Test ===');
console.log('Testing logger module...');
try {
  console.log('✓ Logger module loaded successfully');
  console.log('Logger methods:', Object.keys(logger).join(', '));
} catch (error) {
  console.log('✗ Logger module failed:', error.message);
  console.log('Error details:', error.stack);
}

console.log('\\nTesting database module...');
try {
  console.log('✓ Database module loaded successfully');
  console.log('Database methods:', Object.keys(database).join(', '));
} catch (error) {
  console.log('✗ Database module failed:', error.message);
  console.log('Error details:', error.stack);
}

console.log('\\nTesting tally module...');
try {
  console.log('✓ Tally module loaded successfully');
  console.log('Tally methods:', Object.keys(tally).join(', '));
} catch (error) {
  console.log('✗ Tally module failed:', error.message);
  console.log('Error details:', error.stack);
}

console.log('\\n=== Test Complete ===');
`;

  const testScriptPath = path.join(corePath, "test-modules.mjs");

  try {
    // Write the test script to the core directory
    fs.writeFileSync(testScriptPath, testScript);

    console.log("  Created test script in core directory");
    console.log(`  Executing: node ${testScriptPath}`);

    // Execute the test script from within the core directory
    const child = spawn("node", [testScriptPath], {
      cwd: corePath,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "test" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      console.log(`    ${data.toString().trim()}`);
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      console.log(`    STDERR: ${data.toString().trim()}`);
    });

    child.on("close", (code) => {
      console.log(`    Process exited with code: ${code}`);
      if (code === 0) {
        console.log("    ✓ Module loading test completed successfully");
      } else {
        console.log(`    ✗ Module loading test failed with code: ${code}`);
        if (stderr) {
          console.log(`    Error output: ${stderr}`);
        }
      }

      // Clean up test script
      try {
        fs.unlinkSync(testScriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // Wait for completion
    await new Promise((resolve) => {
      child.on("close", resolve);
    });
  } catch (error) {
    console.log(
      `    ✗ Failed to execute module loading test: ${error.message}`
    );

    // Clean up test script
    try {
      fs.unlinkSync(testScriptPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Test index module execution
async function testIndexExecution(corePath) {
  if (!corePath) {
    console.log("\nSkipping index execution test - no core path found");
    return;
  }

  console.log("\nTesting index module execution...");

  const indexPath = path.join(corePath, "index.mjs");
  if (!fs.existsSync(indexPath)) {
    console.log("  ✗ Index module file not found");
    return;
  }

  console.log("  ✓ Index module file found");

  // Create a simple test config
  const testConfig = {
    database: {
      technology: "mysql",
      server: "localhost",
      port: 3306,
      ssl: false,
      schema: "test",
      username: "test",
      password: "test",
      loadmethod: "insert",
    },
    tally: {
      definition: "tally-export-config.yaml",
      server: "localhost",
      port: 9000,
      company: "test",
      fromdate: "auto",
      todate: "auto",
      frequency: 0,
      sync: "full",
    },
  };

  // Write test config to temp file
  const configPath = path.join(process.cwd(), "test-config.json");
  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

  try {
    console.log("  Attempting to execute index module...");

    // Execute from within the core directory to maintain relative imports
    const child = spawn("node", [indexPath, "--config-path", configPath], {
      cwd: corePath,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "test" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      console.log(`    STDOUT: ${data.toString().trim()}`);
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      console.log(`    STDERR: ${data.toString().trim()}`);
    });

    child.on("close", (code) => {
      console.log(`    Process exited with code: ${code}`);
      if (code === 0) {
        console.log("    ✓ Index module executed successfully");
      } else {
        console.log(`    ✗ Index module failed with code: ${code}`);
        if (stderr) {
          console.log(`    Error output: ${stderr}`);
        }
      }

      // Clean up test config
      try {
        fs.unlinkSync(configPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // Kill the process after 10 seconds
    setTimeout(() => {
      child.kill();
    }, 10000);

    // Wait for completion
    await new Promise((resolve) => {
      child.on("close", resolve);
    });
  } catch (error) {
    console.log(`    ✗ Failed to execute index module: ${error.message}`);

    // Clean up test config
    try {
      fs.unlinkSync(configPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Test the actual sync process simulation
async function testSyncProcess(corePath) {
  if (!corePath) {
    console.log("\nSkipping sync process test - no core path found");
    return;
  }

  console.log("\nTesting sync process simulation...");

  // Create a test config that simulates the actual sync process
  const testConfig = {
    database: {
      technology: "mysql",
      server: "localhost",
      port: 3306,
      ssl: false,
      schema: "test",
      username: "test",
      password: "test",
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
      company: "test",
      fromdate: "auto",
      todate: "auto",
      frequency: 0,
      sync: "full",
    },
  };

  // Write test config
  const configPath = path.join(process.cwd(), "test-sync-config.json");
  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

  try {
    console.log("  Simulating sync process...");

    // Execute the index module with the test config
    const child = spawn(
      "node",
      [path.join(corePath, "index.mjs"), "--config-path", configPath],
      {
        cwd: corePath,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: "test",
          // Add any environment variables that might be needed
          ELECTRON_IS_DEV: "false",
        },
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
      const lines = data.toString().trim().split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          console.log(`    STDOUT: ${line.trim()}`);
        }
      });
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      const lines = data.toString().trim().split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          console.log(`    STDERR: ${line.trim()}`);
        }
      });
    });

    child.on("close", (code) => {
      console.log(`    Process exited with code: ${code}`);
      if (code === 0) {
        console.log("    ✓ Sync process simulation completed successfully");
      } else {
        console.log(`    ✗ Sync process simulation failed with code: ${code}`);
        if (stderr) {
          console.log(`    Error details: ${stderr}`);
        }
      }

      // Clean up test config
      try {
        fs.unlinkSync(configPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    // Kill the process after 15 seconds
    setTimeout(() => {
      child.kill();
    }, 15000);

    // Wait for completion
    await new Promise((resolve) => {
      child.on("close", resolve);
    });
  } catch (error) {
    console.log(`    ✗ Failed to simulate sync process: ${error.message}`);

    // Clean up test config
    try {
      fs.unlinkSync(configPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Main test execution
async function runTests() {
  const corePath = testCorePath();

  if (corePath) {
    await testModuleLoadingFromCoreDir(corePath);
    await testIndexExecution(corePath);
    await testSyncProcess(corePath);
  }

  console.log("\n=== Test Complete ===");
  console.log(
    "\nIf you see any ✗ marks above, those indicate issues that need to be resolved."
  );
  console.log("Common issues:");
  console.log('1. Core modules not built - run "npm run build:core"');
  console.log("2. Module resolution issues - check import/export statements");
  console.log("3. Missing dependencies - check package.json");
  console.log("4. File permissions - ensure files are readable");
  console.log(
    "5. Relative import issues - ensure modules are executed from correct directory"
  );
  console.log("6. Configuration issues - check config file format and content");
}

runTests().catch(console.error);
