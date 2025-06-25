#!/usr/bin/env node

/**
 * Test script to verify definition file path resolution
 */

const path = require("path");
const fs = require("fs");

console.log("=== Definition File Path Test ===");

// Simulate both development and packaged environments
const scenarios = [
  {
    name: "Development Environment",
    isPackaged: false,
    cwd: process.cwd(),
    resourcesPath: null,
  },
  {
    name: "Packaged Environment",
    isPackaged: true,
    cwd: process.cwd(),
    resourcesPath: path.join(process.cwd(), "dist"),
  },
];

for (const scenario of scenarios) {
  console.log(`\n🔍 Testing ${scenario.name}...`);

  // Simulate the path resolution logic from core-bridge
  const definitionFileName = "tally-export-config.yaml";
  const definitionPath = scenario.isPackaged
    ? path.join(scenario.resourcesPath, definitionFileName)
    : path.join(scenario.cwd, definitionFileName);

  console.log(`Definition file path: ${definitionPath}`);

  if (fs.existsSync(definitionPath)) {
    console.log(`✅ File exists`);

    // Try to read the file
    try {
      const content = fs.readFileSync(definitionPath, "utf-8");
      console.log(`✅ File readable (${content.length} characters)`);

      // Check if it's valid YAML by looking for key sections
      if (content.includes("master:") && content.includes("transaction:")) {
        console.log(`✅ File appears to be valid YAML with required sections`);
      } else {
        console.log(
          `⚠️  File may not have required 'master' and 'transaction' sections`
        );
      }
    } catch (error) {
      console.log(`❌ File not readable: ${error.message}`);
    }
  } else {
    console.log(`❌ File not found`);

    // Check if the directory exists
    const dir = path.dirname(definitionPath);
    if (fs.existsSync(dir)) {
      console.log(`✅ Directory exists: ${dir}`);

      // List files in the directory
      try {
        const files = fs.readdirSync(dir);
        console.log(`Files in directory: ${files.join(", ")}`);
      } catch (error) {
        console.log(`Cannot list directory: ${error.message}`);
      }
    } else {
      console.log(`❌ Directory not found: ${dir}`);
    }
  }
}

console.log("\n=== Test Summary ===");
console.log(
  "This test verifies that the definition file path resolution works correctly."
);
console.log(
  "If any scenario shows ❌, the packaged app may have issues finding the definition file."
);
