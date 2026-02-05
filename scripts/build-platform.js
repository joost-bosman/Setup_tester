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

const binName = platform === "win32" ? "electron-builder.cmd" : "electron-builder";
const binPath = path.join(__dirname, "..", "node_modules", ".bin", binName);
const args = [binPath];
if (target) args.push(target);
args.push(`--config.directories.output=${outputDir}`);

const child = spawn(args[0], args.slice(1), { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => process.exit(1));
