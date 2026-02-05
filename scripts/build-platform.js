const { spawn } = require("child_process");
const path = require("path");

const platform = process.platform;
let target = null;
let outputDir = "dist";

if (platform === "win32") {
  target = "--win";
  outputDir = "dist/windows";
} else if (platform === "darwin") {
  target = "--mac";
  outputDir = "dist/macos";
}

const cliPath = require.resolve("electron-builder/cli.js");
const args = [cliPath];
if (target) args.push(target);
args.push(`--config.directories.output=${outputDir}`);

const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => process.exit(1));
