#!/usr/bin/env node

/**
 * Simple test script to quickly test core module loading
 */

const path = require("path");
const fs = require("fs");

console.log("=== Simple Core Module Test ===");
console.log(`Working directory: ${process.cwd()}`);

// Find core directory
const possiblePaths = [
  path.join(process.cwd(), "core", "dist"),
  path.join(process.cwd(), "dist", "core", "dist"),
  path.join(__dirname, "core", "dist"),
  path.join(__dirname, "dist", "core", "dist"),
];

let corePath = null;
for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    corePath = testPath;
    console.log(`Found core directory: ${corePath}`);
    break;
  }
}

if (!corePath) {
  console.log("❌ No core directory found!");
  process.exit(1);
}

// Check if key files exist
const keyFiles = [
  "index.mjs",
  "logger.mjs",
  "database.mjs",
  "tally.mjs",
  "utility.mjs",
];
for (const file of keyFiles) {
  const filePath = path.join(corePath, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found: ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
  }
}

console.log("\n=== Testing Module Loading ===");

// Create a simple test script
const testScript = `
import { logger } from './logger.mjs';
import { database } from './database.mjs';
import { tally } from './tally.mjs';

console.log('✅ All modules loaded successfully!');
console.log('Logger:', typeof logger);
console.log('Database:', typeof database);
console.log('Tally:', typeof tally);
`;

const testPath = path.join(corePath, "simple-test.mjs");
fs.writeFileSync(testPath, testScript);

// Execute the test
const { spawn } = require("child_process");
const child = spawn("node", [testPath], {
  cwd: corePath,
  stdio: "inherit",
});

child.on("close", (code) => {
  // Clean up
  try {
    fs.unlinkSync(testPath);
  } catch (e) {
    // Ignore cleanup errors
  }

  if (code === 0) {
    console.log("\n✅ Core modules test passed!");
  } else {
    console.log(`\n❌ Core modules test failed with code: ${code}`);
  }
});
