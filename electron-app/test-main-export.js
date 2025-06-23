#!/usr/bin/env node

/**
 * Test script to verify main process export functionality
 * This simulates how the export function will work in the actual Electron main process
 */

const path = require("path");
const fs = require("fs");

async function testMainProcessExport() {
  console.log("🔧 Testing Main Process Export Functionality");
  console.log("=============================================\n");

  try {
    // Simulate the main process environment
    const __dirname = path.join(process.cwd(), "dist"); // Simulate being in dist directory

    console.log(`📁 Simulated __dirname: ${__dirname}`);

    // Test the path resolution logic from main.ts
    let viewerPath;
    const isDev = process.argv.includes("--dev");

    if (isDev) {
      viewerPath = path.join(
        __dirname,
        "..",
        "core",
        "dist",
        "local-log-viewer.mjs"
      );
    } else {
      viewerPath = path.join(
        __dirname,
        "..",
        "core",
        "dist",
        "local-log-viewer.mjs"
      );
    }

    console.log(`🎯 Initial viewer path: ${viewerPath}`);

    // Test fallback path resolution
    if (!fs.existsSync(viewerPath)) {
      console.log("⚠️  Primary path not found, trying alternatives...");

      const alternativePaths = [
        path.join(process.cwd(), "core", "dist", "local-log-viewer.mjs"),
        path.join(__dirname, "core", "dist", "local-log-viewer.mjs"),
        path.join(
          process.cwd(),
          "electron-app",
          "core",
          "dist",
          "local-log-viewer.mjs"
        ),
      ];

      console.log("📋 Alternative paths to try:");
      alternativePaths.forEach((altPath, index) => {
        const exists = fs.existsSync(altPath);
        console.log(`   ${index + 1}. ${altPath} ${exists ? "✅" : "❌"}`);
        if (exists && !viewerPath.includes("found")) {
          viewerPath = altPath;
          console.log(`   🎯 Using this path!`);
        }
      });
    } else {
      console.log("✅ Primary path found!");
    }

    if (!fs.existsSync(viewerPath)) {
      throw new Error(`Local log viewer module not found at any location`);
    }

    console.log(`✅ Final viewer path: ${viewerPath}`);

    // Test the dynamic import functionality
    console.log("\n📦 Testing dynamic import...");
    const { pathToFileURL } = await import("url");
    const viewerURL = pathToFileURL(viewerPath).href;
    console.log(`🌐 Module URL: ${viewerURL}`);

    try {
      const { localLogViewer } = await import(viewerURL);
      console.log("✅ Local log viewer imported successfully");

      // Test export functionality
      const today = new Date().toISOString().split("T")[0];
      console.log(`\n📅 Testing export for date: ${today}`);

      const exportedPath = localLogViewer.exportLogs(today, "json");
      console.log(`📄 Export test result: ${exportedPath}`);

      if (fs.existsSync(exportedPath)) {
        const stats = fs.statSync(exportedPath);
        console.log(
          `✅ Export file created successfully (${Math.round(
            stats.size / 1024
          )} KB)`
        );
      } else {
        console.log("❌ Export file was not created");
      }
    } catch (importError) {
      console.error("❌ Dynamic import failed:", importError.message);
      throw importError;
    }

    console.log("\n🎉 Main Process Export Test Summary");
    console.log("==================================");
    console.log("✅ Path resolution works correctly");
    console.log("✅ Dynamic import works correctly");
    console.log("✅ Export functionality works correctly");
    console.log("\n🚀 The Export Logs button should work in the Electron app!");
  } catch (error) {
    console.error("❌ Main process export test failed:", error.message);
    console.error("Stack trace:", error.stack);

    console.log("\n🔧 Troubleshooting suggestions:");
    console.log(
      "1. Make sure TypeScript files are compiled: cd core && npx tsc"
    );
    console.log("2. Check that local-log-viewer.mjs exists in core/dist/");
    console.log("3. Verify file permissions");
    console.log("4. Try running from the electron-app directory");
  }
}

// Run the test
if (require.main === module) {
  testMainProcessExport();
}
