const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const dirIndex = args.indexOf("--dir");
const eolIndex = args.indexOf("--eol");

if (dirIndex === -1 || eolIndex === -1) {
  console.error("Usage: node normalize-line-endings.js --dir <path> --eol <lf|crlf>");
  process.exit(1);
}

const baseDir = path.resolve(args[dirIndex + 1]);
const eol = args[eolIndex + 1] === "crlf" ? "\r\n" : "\n";

const textExtensions = new Set([
  ".js",
  ".json",
  ".css",
  ".html",
  ".md",
  ".txt",
  ".yml",
  ".yaml",
  ".sh",
  ".bat",
  ".ps1"
]);

function isBinary(buffer) {
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function normalizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!textExtensions.has(ext)) return;
  const buffer = fs.readFileSync(filePath);
  if (isBinary(buffer)) return;
  const text = buffer.toString("utf8");
  const normalized = text.replace(/\r?\n/g, eol);
  if (normalized !== text) {
    fs.writeFileSync(filePath, normalized, "utf8");
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.isFile()) normalizeFile(fullPath);
  }
}

walk(baseDir);
