const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const projectRoot = path.join(__dirname, "..");
const assetsDir = path.join(projectRoot, "assets");
const winPng = path.join(assetsDir, "icon-win.png");
const winIco = path.join(assetsDir, "icon-win.ico");
const macPng = path.join(assetsDir, "icon-mac.png");
const macIcns = path.join(assetsDir, "icon-mac.icns");
const macIconset = path.join(assetsDir, "icon-mac.iconset");

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

function generateMacIcns() {
  if (process.platform !== "darwin") return;
  if (fs.existsSync(macIcns)) return;
  if (!fs.existsSync(macPng)) {
    throw new Error("Missing assets/icon-mac.png; cannot generate .icns.");
  }

  fs.rmSync(macIconset, { recursive: true, force: true });
  fs.mkdirSync(macIconset, { recursive: true });

  const sizes = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"],
  ];

  for (const [size, name] of sizes) {
    execFileSync("sips", ["-z", String(size), String(size), macPng, "--out", path.join(macIconset, name)], {
      stdio: "ignore",
    });
  }

  execFileSync("iconutil", ["-c", "icns", macIconset, "-o", macIcns], { stdio: "ignore" });
  fs.rmSync(macIconset, { recursive: true, force: true });
  console.log("Generated assets/icon-mac.icns");
}

Promise.resolve()
  .then(generateWinIco)
  .then(generateMacIcns)
  .catch((err) => {
    console.error("Icon generation failed:", err.message || err);
    process.exit(1);
  });
