# Multilingual Developer Diagnostics Tool

![Build](https://img.shields.io/github/actions/workflow/status/joost-bosman/Multilingual_Developer_Diagnostics_Tool/build-release.yml?label=build)

Know your setup. Fix the gaps. Feel the 'yes! yes!' when you code, for Windows and macOS.

This is the tool you reach for when you want to feel confident about the current state of your setup. Run it and you will see what is strong, what is missing, and what is holding you back across hardware, software, IDE, language(s), and Wi-Fi/LAN. Then comes the best part: it turns that insight into clear, practical suggestions, plus an exportable checklist so you can improve step by step.

Main goal: get the most from your setup and feel that smooth, fast "yes! yes!" energy as you start coding and developing.

Good luck! Cheers!

## Why this exists
At a certain point, you want to know the real state of your setup, what is missing, and how to make it faster, smoother, and more efficient. This tool makes that clear and gives you a path to fix it.

## Download
- Latest releases: https://github.com/joost-bosman/Multilingual_Developer_Diagnostics_Tool/releases

## Documentation
- Explained guide: `docs/EXPLAINED.md`
- Supported languages: `docs/LANGUAGES.md`
- PDF export: `npm run docs:pdf` -> `docs/EXPLAINED.pdf`

<table>
  <tr>
    <td align="center" width="260" height="140"><b>Setup phase</b><br/>Install + Start</td>
    <td align="center" width="60">-></td>
    <td align="center" width="260" height="140"><b>Input</b><br/>Mode + Test</td>
    <td align="center" width="60">-></td>
    <td align="center" width="260" height="140"><b>Diagnostics</b><br/>OS - CPU - GPU - Memory - Internet</td>
    <td align="center" width="60">-></td>
    <td align="center" width="260" height="140"><b>Output</b><br/>Results + Suggestions + Export</td>
  </tr>
</table>

## Features
- Pick your depth: quick scan for readiness or full scan for maximum performance.
  - Checks OS, CPU, GPU, memory, and internet latency.
  - Automatically verifies detected CLI tools and builds.
- Optimization that feels practical.
  - Hardware checks are always on.
  - Software checks run only when you opt in.
- Multilingual by default.
  - Choose a language on first launch.
  - Supports 49 languages.
  - Auto-detect by region with English (UK) fallback.
- Results you can act on.
  - Brief mode: a fast overview plus focused fixes for weak spots and missing dependencies.
  - Extensive mode: deeper detail and broader tuning suggestions.
  - Export to TXT or PDF with timestamped filenames: `results_diagnostic_DDMMYY`.
  - Shows "n/a" when the OS/driver cannot provide a value.

## Quick start
Get moving in two commands:
```bash
npm install
npm start
```

## Build installers
Build the installer packages:
```bash
npm run pack
npm run build
```

macOS helper:
- `./mac_diagtool_program_builder.sh`
- Note: I made an auto builder for macOS, but I could not build it myself.

## Where the executables are
- Output folders:
  - Windows: `dist/windows/`
  - macOS: `dist/macos/`
- Windows installer: `*.exe` (NSIS)
- macOS installer: `*.dmg`
The mac helper script generates `assets/icon-mac.icns` from `assets/icon-mac.png` before building.

## Trust and quality
- CI build status is visible via the badge at the top of this README.
- Each release includes a clear change summary.
- See `TEST_REPORT.md` for recent test runs.

## Manual step
- Add GitHub Topics in repo settings (e.g., diagnostics, electron, windows, macos, developer-tools).

## Contributing
See `CONTRIBUTING.md`.

## Code of conduct
See `CODE_OF_CONDUCT.md`.

## Security
See `SECURITY.md`.

## Roadmap
See `docs/ROADMAP.md`.

## Keywords
See `docs/KEYWORDS.md`.

## Credits
See `CREDITS.md`.



