const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const assetsDir = path.join(projectRoot, "assets");
const winPng = path.join(assetsDir, "icon-win.png");
const winIco = path.join(assetsDir, "icon-win.ico");

async function generateWinIco() {
  if (fs.existsSync(winIco)) return;
  if (!fs.existsSync(winPng)) {
    console.warn("Missing assets/icon-win.png; skipping .ico generation.");
    return;
  }

  const pngToIco = require("png-to-ico");
  const buf = await pngToIco(winPng);
  fs.writeFileSync(winIco, buf);
  console.log("Generated assets/icon-win.ico");
}

generateWinIco().catch((err) => {
  console.error("Icon generation failed:", err.message || err);
  process.exit(1);
});
