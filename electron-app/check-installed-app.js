#!/usr/bin/env node

/**
 * Script to check what files are present in the installed application
 * Run this after installing the MSI to verify the core modules are included
 */

const path = require("path");
const fs = require("fs");

console.log("=== Installed Application Check ===");

// Common installation paths
const possiblePaths = [
  "C:\\Program Files\\Tally Database Loader",
  "C:\\Program Files (x86)\\Tally Database Loader",
  process.env.LOCALAPPDATA + "\\Programs\\Tally Database Loader",
  process.env.APPDATA + "\\Tally Database Loader",
];

let appPath = null;

for (const testPath of possiblePaths) {
  if (fs.existsSync(testPath)) {
    appPath = testPath;
    console.log(`Found application at: ${appPath}`);
    break;
  }
}

if (!appPath) {
  console.log("❌ Could not find installed application");
  console.log("Searched in:");
  possiblePaths.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}

// Check application structure
console.log("\n=== Application Structure ===");

// Check main executable
const exePath = path.join(appPath, "Tally Database Loader.exe");
if (fs.existsSync(exePath)) {
  const stats = fs.statSync(exePath);
  console.log(
    `✅ Main executable: ${(stats.size / 1024 / 1024).toFixed(1)} MB`
  );
} else {
  console.log("❌ Main executable not found");
}

// Check resources directory
const resourcesPath = path.join(appPath, "resources");
console.log(`\nChecking resources directory: ${resourcesPath}`);

if (fs.existsSync(resourcesPath)) {
  console.log("✅ Resources directory exists");

  // List all files in resources
  const resourcesFiles = fs.readdirSync(resourcesPath);
  console.log("Resources files:");
  resourcesFiles.forEach((file) => {
    const filePath = path.join(resourcesPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      console.log(`  📁 ${file}/`);
    } else {
      console.log(`  📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    }
  });

  // Check core directory specifically
  const corePath = path.join(resourcesPath, "core");
  console.log(`\nChecking core directory: ${corePath}`);

  if (fs.existsSync(corePath)) {
    console.log("✅ Core directory exists");

    // List all files in core
    const coreFiles = fs.readdirSync(corePath);
    console.log("Core files:");
    coreFiles.forEach((file) => {
      const filePath = path.join(corePath, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log(`  📁 ${file}/`);
        // List files in subdirectory
        const subFiles = fs.readdirSync(filePath);
        subFiles.forEach((subFile) => {
          const subFilePath = path.join(filePath, subFile);
          const subStats = fs.statSync(subFilePath);
          console.log(
            `    📄 ${subFile} (${(subStats.size / 1024).toFixed(1)} KB)`
          );
        });
      } else {
        console.log(`  📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    });

    // Check for specific .mjs files
    const requiredMjsFiles = [
      "index.mjs",
      "logger.mjs",
      "database.mjs",
      "tally.mjs",
    ];
    console.log("\nChecking required .mjs files:");
    for (const file of requiredMjsFiles) {
      const filePath = path.join(corePath, file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`❌ ${file} - MISSING`);
      }
    }
  } else {
    console.log("❌ Core directory not found!");
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
    const filePath = path.join(resourcesPath, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`❌ ${file} - MISSING`);
    }
  }
} else {
  console.log("❌ Resources directory not found!");
}

console.log("\n=== Check Complete ===");
console.log(
  "If any required files are missing, the build process needs to be fixed."
);
