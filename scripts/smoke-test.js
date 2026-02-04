const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const requiredFiles = [
  "main.js",
  "preload.js",
  "renderer.js",
  "index.html",
  "styles.css",
  "assets/icon-win.png",
  "assets/icon-win.ico",
  "assets/icon-mac.png",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(projectRoot, file)));

if (missing.length > 0) {
  console.error("Smoke test failed. Missing files:");
  for (const file of missing) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Smoke test passed.");
