# Local Resource Diagnostic Tool

![Build](https://github.com/joost-bosman/local_resource_diagnostic_tool/actions/workflows/build-release.yml/badge.svg)

Small Windows + macOS diagnostics app with privacy controls and export.

<table>
  <tr>
    <td align="center" width="260" height="140"><b>Setup fase</b><br/>Install + Start</td>
    <td align="center" width="60">-></td>
    <td align="center" width="260" height="140"><b>Input</b><br/>Mode + Privacy</td>
    <td align="center" width="60">-></td>
    <td align="center" width="260" height="140"><b>Diagnostics</b><br/>OS - CPU - GPU - Memory - Internet</td>
    <td align="center" width="60">-></td>
    <td align="center" width="260" height="140"><b>Output</b><br/>Results + Suggestions + Export</td>
  </tr>
</table>

## Features
- Quick or full diagnostics
  - Tests: OS info, CPU, GPU, memory, internet latency.
  - Tool also tests for possible CLI builds.
- Privacy mode
  - Private (default) or public (redacted)
- Export results to TXT or PDF
  - Includes optimization suggestions
- Timestamped filenames: `results_diagnostic_DDMMYY`
- Optimization suggestions based on the latest diagnostics

## Notes
- Public mode redacts username/hostname/home paths; private mode shows all details.
- Speedtest runs hidden (up to ~60s); failures show as errors.
- Some hardware fields can be n/a (GPU cores/speed/voltage, CPU voltage).
- Windows uses `assets/icon-win.ico` (generated from `assets/icon-win.png`).

## Setup fase
- Install dependencies: `npm install`
- Start the app: `npm start`

## Build
- Electron-based build (applies to both Windows and macOS).

### Windows tool
- `npm run pack` (folder build)
- `npm run build` (installer)

### Mac tool
- macOS helper: `./mac_diagtool_program_builder.sh`
- Note: I made an auto builder for macOS, but I could not build it myself.

## Where the executables are
- Build output goes to `dist/`.
- Windows: `*.exe` (NSIS) in `dist/`.
- macOS: `*.dmg` in `dist/`.
- Note: macOS installers are best built on macOS, and need to be built by the user because I do not have a Mac.
- Tests were run before push, and releases are on GitHub.
- The mac helper script generates `assets/icon-mac.icns` from `assets/icon-mac.png` before building.

## Credits
Source icons:
- http://toastytech.com/guis/win98.html
- https://www.aicerts.ai/news/apple-ai-strategy-the-invisible-approach-wall-street-is-questioning/
- https://www.speedtest.net/


