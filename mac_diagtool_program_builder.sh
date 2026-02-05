#!/usr/bin/env bash
set -euo pipefail

# Simple macOS build helper for this Electron app.
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install it from https://nodejs.org/ and re-run."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not available. Install Node.js (which includes npm) and re-run."
  exit 1
fi

echo "Installing dependencies..."
npm install

ASSETS_DIR="$(cd "$(dirname "$0")" && pwd)/assets"
ICON_PNG="$ASSETS_DIR/icon-mac.png"
ICON_ICNS="$ASSETS_DIR/icon-mac.icns"
ICONSET_DIR="$ASSETS_DIR/icon-mac.iconset"

if [ ! -f "$ICON_PNG" ]; then
  echo "Missing $ICON_PNG. Add the mac icon PNG and re-run."
  exit 1
fi

if [ ! -f "$ICON_ICNS" ]; then
  if ! command -v sips >/dev/null 2>&1 || ! command -v iconutil >/dev/null 2>&1; then
    echo "sips/iconutil not found. These tools are required to generate .icns."
    exit 1
  fi
  echo "Generating icon-mac.icns from icon-mac.png..."
  rm -rf "$ICONSET_DIR"
  mkdir -p "$ICONSET_DIR"
  sips -z 16 16 "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16.png" >/dev/null
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET_DIR/icon_16x16@2x.png" >/dev/null
  sips -z 32 32 "$ICON_PNG" --out "$ICONSET_DIR/icon_32x32.png" >/dev/null
  sips -z 64 64 "$ICON_PNG" --out "$ICONSET_DIR/icon_32x32@2x.png" >/dev/null
  sips -z 128 128 "$ICON_PNG" --out "$ICONSET_DIR/icon_128x128.png" >/dev/null
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET_DIR/icon_128x128@2x.png" >/dev/null
  sips -z 256 256 "$ICON_PNG" --out "$ICONSET_DIR/icon_256x256.png" >/dev/null
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET_DIR/icon_256x256@2x.png" >/dev/null
  sips -z 512 512 "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512.png" >/dev/null
  sips -z 1024 1024 "$ICON_PNG" --out "$ICONSET_DIR/icon_512x512@2x.png" >/dev/null
  iconutil -c icns "$ICONSET_DIR" -o "$ICON_ICNS"
  rm -rf "$ICONSET_DIR"
fi

echo "Building installers..."
DDK_EOL=lf npm run build

echo "Done. Check the dist/ folder for the DMG."
