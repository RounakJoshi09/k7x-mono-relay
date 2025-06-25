#!/usr/bin/env node

/**
 * Test script to verify dependencies can be loaded in packaged environment
 */

const path = require("path");
const fs = require("fs");

console.log("=== Dependency Test ===");
console.log(`Working directory: ${process.cwd()}`);
console.log(`NODE_PATH: ${process.env.NODE_PATH || "Not set"}`);

// Test if we can find node_modules
const possibleNodeModulesPaths = [
  path.join(process.cwd(), "node_modules"),
  path.join(process.resourcesPath || "", "node_modules"),
  ...(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []),
];

console.log("\nChecking node_modules locations:");
for (const nodeModulesPath of possibleNodeModulesPaths) {
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`✅ Found: ${nodeModulesPath}`);

    // Check for key dependencies
    const keyDeps = [
      "mysql2",
      "pg",
      "tedious",
      "@google-cloud/bigquery",
      "ssh2",
    ];
    for (const dep of keyDeps) {
      const depPath = path.join(nodeModulesPath, dep);
      if (fs.existsSync(depPath)) {
        console.log(`  ✅ ${dep}`);
      } else {
        console.log(`  ❌ ${dep} - MISSING`);
      }
    }
  } else {
    console.log(`❌ Not found: ${nodeModulesPath}`);
  }
}

// Test loading dependencies
console.log("\nTesting dependency loading:");

async function testDependency(name, importPath) {
  try {
    console.log(`Testing ${name}...`);
    const module = await import(importPath);
    console.log(`✅ ${name} loaded successfully`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} failed: ${error.message}`);
    return false;
  }
}

// Test each dependency
const tests = [
  ["mysql2", "mysql2"],
  ["pg", "pg"],
  ["tedious", "tedious"],
  ["BigQuery", "@google-cloud/bigquery"],
  ["ssh2", "ssh2"],
];

let allPassed = true;

for (const [name, importPath] of tests) {
  const passed = await testDependency(name, importPath);
  if (!passed) {
    allPassed = false;
  }
}

console.log("\n=== Test Summary ===");
if (allPassed) {
  console.log("✅ All dependencies loaded successfully!");
} else {
  console.log("❌ Some dependencies failed to load");
  console.log(
    "\nThis indicates that the packaged app may have dependency issues."
  );
}

console.log("\nTo fix dependency issues in packaged app:");
console.log("1. Ensure node_modules is included in extraResources");
console.log("2. Set NODE_PATH correctly in the core process");
console.log("3. Verify all dependencies are listed in package.json");
