#!/usr/bin/env node

/**
 * Test script to simulate packaged environment and test dependency loading
 */

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

console.log("=== Packaged Environment Dependency Test ===");

// Simulate the packaged environment
const resourcesPath = path.join(process.cwd(), "dist");
const corePath = path.join(resourcesPath, "core");
const nodeModulesPath = path.join(resourcesPath, "node_modules");

console.log(`Resources path: ${resourcesPath}`);
console.log(`Core path: ${corePath}`);
console.log(`Node modules path: ${nodeModulesPath}`);

// Check if the paths exist
if (!fs.existsSync(resourcesPath)) {
  console.log('❌ Resources path not found. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(corePath)) {
  console.log('❌ Core path not found. Run "npm run build" first.');
  process.exit(1);
}

if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ Node modules path not found. Run "npm run build" first.');
  process.exit(1);
}

console.log("✅ All paths exist");

// Test dependency loading in a child process with packaged environment
console.log("\n🔍 Testing dependency loading in packaged environment...");

const testScript = `
const path = require('path');

// Set up the packaged environment
process.env.NODE_PATH = '${nodeModulesPath.replace(/\\/g, "\\\\")}';
process.env.NODE_ENV = 'production';

console.log('NODE_PATH:', process.env.NODE_PATH);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test loading dependencies
async function testDeps() {
  const deps = [
    ['mysql2', 'mysql2'],
    ['pg', 'pg'],
    ['tedious', 'tedious'],
    ['BigQuery', '@google-cloud/bigquery'],
    ['ssh2', 'ssh2']
  ];

  for (const [name, importPath] of deps) {
    try {
      console.log(\`Testing \${name}...\`);
      const module = await import(importPath);
      console.log(\`✅ \${name} loaded successfully\`);
    } catch (error) {
      console.log(\`❌ \${name} failed: \${error.message}\`);
    }
  }
}

testDeps().catch(console.error);
`;

const testFilePath = path.join(process.cwd(), "temp-dependency-test.js");
fs.writeFileSync(testFilePath, testScript);

// Run the test in a child process
const child = spawn("node", [testFilePath], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_PATH: nodeModulesPath,
    NODE_ENV: "production",
  },
});

child.on("close", (code) => {
  // Clean up
  fs.unlinkSync(testFilePath);

  if (code === 0) {
    console.log("\n✅ Dependency test completed successfully!");
  } else {
    console.log("\n❌ Dependency test failed!");
    console.log(
      "\nThis indicates that the packaged app will have dependency issues."
    );
    console.log("\nTo fix:");
    console.log("1. Ensure node_modules is included in extraResources");
    console.log("2. Set NODE_PATH correctly in the core process");
    console.log("3. Verify all dependencies are listed in package.json");
  }
});

child.on("error", (error) => {
  console.error("Failed to start test process:", error);
  fs.unlinkSync(testFilePath);
});
