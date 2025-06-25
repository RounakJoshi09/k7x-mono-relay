#!/usr/bin/env node

/**
 * Verification script to check if core modules are properly built
 * Run this before building the installer to ensure everything is ready
 */

const path = require("path");
const fs = require("fs");

console.log("=== Build Verification ===");
console.log(`Working directory: ${process.cwd()}`);

let missingFiles = [];

// Check if core/dist exists and has the required files
const coreDistPath = path.join(process.cwd(), "core", "dist");
console.log(`\nChecking core/dist directory: ${coreDistPath}`);

if (!fs.existsSync(coreDistPath)) {
  console.log("❌ core/dist directory not found!");
  console.log('Run "npm run build:core" to build the core modules');
  missingFiles.push(coreDistPath);
} else {
  console.log("✅ core/dist directory exists");

  // Check for required .mjs files
  const requiredFiles = [
    "index.mjs",
    "logger.mjs",
    "database.mjs",
    "tally.mjs",
    "utility.mjs",
    "error-handler.mjs",
    "log-manager.mjs",
    "ssh-tunnel.mjs",
    "definition.mjs",
  ];

  console.log("\nChecking required .mjs files:");
  for (const file of requiredFiles) {
    const filePath = path.join(coreDistPath, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      missingFiles.push(filePath);
    }
  }

  // Check core modules
  console.log("\n🔍 Checking core modules...");
  const coreFiles = [
    "index.mjs",
    "database.mjs",
    "tally.mjs",
    "logger.mjs",
    "error-handler.mjs",
    "log-manager.mjs",
    "local-log-aggregator.mjs",
    "local-log-viewer.mjs",
    "server.mjs",
    "ssh-tunnel.mjs",
    "utility.mjs",
    "definition.mjs",
  ];

  for (const file of coreFiles) {
    const filePath = path.join(coreDistPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      missingFiles.push(filePath);
    }
  }

  // Check dependencies
  console.log("\n🔍 Checking dependencies...");
  const keyDependencies = [
    "mysql2",
    "pg",
    "tedious",
    "@google-cloud/bigquery",
    "ssh2",
    "ws",
    "js-yaml",
  ];

  for (const dep of keyDependencies) {
    const depPath = path.join(process.cwd(), "node_modules", dep);
    if (fs.existsSync(depPath)) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
      missingFiles.push(depPath);
    }
  }
}

// Check if dist directory exists and has the main app files
const distPath = path.join(process.cwd(), "dist");
console.log(`\nChecking dist directory: ${distPath}`);

if (!fs.existsSync(distPath)) {
  console.log("❌ dist directory not found!");
  console.log('Run "npm run build" to build the application');
  missingFiles.push(distPath);
} else {
  console.log("✅ dist directory exists");

  // Check for main app files
  const mainFiles = ["main.js", "core-bridge.js", "preload.js"];

  console.log("\nChecking main app files:");
  for (const file of mainFiles) {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`❌ ${file} - MISSING`);
      missingFiles.push(filePath);
    }
  }

  // Check if core modules are copied to dist
  const distCorePath = path.join(distPath, "core", "dist");
  console.log(`\nChecking dist/core/dist: ${distCorePath}`);

  if (!fs.existsSync(distCorePath)) {
    console.log("❌ dist/core/dist directory not found!");
    console.log('Run "npm run copy-files" to copy core modules');
    missingFiles.push(distCorePath);
  } else {
    console.log("✅ dist/core/dist directory exists");

    // Check a few key files
    const keyFiles = ["index.mjs", "logger.mjs", "database.mjs", "tally.mjs"];
    for (const file of keyFiles) {
      const filePath = path.join(distCorePath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`❌ ${file} - MISSING`);
        missingFiles.push(filePath);
      }
    }
  }
}

// Check configuration files
console.log("\nChecking configuration files:");
const configFiles = [
  "config-default.json",
  "tally-export-config.yaml",
  "tally-export-config-incremental.yaml",
  "database-structure.sql",
  "database-structure-incremental.sql",
];

for (const file of configFiles) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    missingFiles.push(filePath);
  }
}

// Summary
console.log("\n=== Build Verification Summary ===");
if (missingFiles.length === 0) {
  console.log("✅ All checks passed! Ready to build installer.");
  console.log("\nYou can now run:");
  console.log("  npm run dist:win-msi    (for MSI installer)");
  console.log("  npm run dist:win-nsis   (for NSIS installer)");
  console.log("  npm run dist:win        (for both)");
} else {
  console.log(
    "❌ Some checks failed! Please fix the issues above before building."
  );
  console.log("\nTo fix, run:");
  console.log("  npm run clean");
  console.log("  npm run build");
  process.exit(1);
}
