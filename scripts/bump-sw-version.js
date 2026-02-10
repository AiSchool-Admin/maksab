#!/usr/bin/env node

/**
 * Auto-bumps the APP_VERSION in public/sw.js before each build.
 * Uses a timestamp-based version to ensure uniqueness per deploy.
 * Format: YYYY.MM.DD.HHMM (e.g., 2026.02.10.1430)
 */

const fs = require("fs");
const path = require("path");

const SW_PATH = path.join(__dirname, "..", "public", "sw.js");

const now = new Date();
const version = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  String(now.getHours()).padStart(2, "0") + String(now.getMinutes()).padStart(2, "0"),
].join(".");

try {
  let content = fs.readFileSync(SW_PATH, "utf-8");
  content = content.replace(
    /const APP_VERSION = "[^"]+"/,
    `const APP_VERSION = "${version}"`
  );
  fs.writeFileSync(SW_PATH, content, "utf-8");
  console.log(`[bump-sw-version] Updated SW version to ${version}`);
} catch (err) {
  console.error("[bump-sw-version] Failed:", err.message);
  process.exit(1);
}
