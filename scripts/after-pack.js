const path = require("path");
const { spawnSync } = require("child_process");

exports.default = async function afterPack(context) {
  const outputDir = context.appOutDir;
  const platform = process.platform;
  const forced = process.env.DDK_EOL;
  const eol = forced === "crlf" || forced === "lf"
    ? forced
    : platform === "win32"
      ? "crlf"
      : "lf";

  const script = path.join(__dirname, "normalize-line-endings.js");
  const result = spawnSync(process.execPath, [script, "--dir", outputDir, "--eol", eol], {
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Line ending normalization failed.");
  }
};
