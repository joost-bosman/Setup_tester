# Developer Diagnostics Kit

![Build](https://github.com/joost-bosman/developer_diagnostics_kit/actions/workflows/build-release.yml/badge.svg)

Windows + macOS diagnostics kit for quick checks of hardware, software, and internet versions/settings.
Based on the results, it provides suggestions to enhance PC/laptop experience and improve performance for developers.

## Download
- Latest releases: https://github.com/joost-bosman/developer_diagnostics_kit/releases

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
- Quick or full diagnostics
  - Tests: OS info, CPU, GPU, memory, internet latency.
  - The tool automatically checks CLI tool builds (when detected).
- Optimization checks
  - Hardware (always)
  - Software (only when selected)
- Test mode
  - Brief  
    Short testing, quick overview of components, plus focused suggestions for weak spots and dependencies.
  - Extensive  
    Deep testing with more detailed results and broader suggestions to maximize hardware/software performance.
- Output results
  - Format: TXT or PDF
  - Timestamped filenames: `results_diagnostic_DDMMYY`
  - Optimization suggestions included
  - When the OS/driver can't provide it, may show "n/a".

## Quick start
```bash
npm install
npm start
```

## Build installers
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
- macOS builds are best done on macOS (I don't have a Mac).
- Tests run before push; releases are on GitHub.
- The mac helper script generates `assets/icon-mac.icns` from `assets/icon-mac.png` before building.

## Credits
See `CREDITS.md`.

