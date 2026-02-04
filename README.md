# Local Resource Diagnostic Tool

![Build](https://github.com/joost-bosman/local_resource_diagnostic_tool/actions/workflows/build-release.yml/badge.svg)

Small Windows + macOS diagnostics app with privacy controls and export.

<table>
  <tr>
    <td align="center" width="260" height="140"><b>Setup phase</b><br/>Install + Start</td>
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
  - The tool automatically checks CLI builds.
- Optimization checks
  - Hardware (always)
  - Software (only when selected)
- Privacy mode
  - Private (default)
  - Public (redacted)
- Output results
  - Format: TXT or PDF
  - Timestamped filenames: `results_diagnostic_DDMMYY`
  - Optimization suggestions included

## Notes
- Mode
  - Public (redacts username/hostname/home paths)
  - Private (shows all details)
- Speedtest
  - Runs hidden (up to ~60s); failures show as errors.
- Component fields in results (cores/speed/etc.)
  - When the OS/driver can't provide it, may show "n/a".

## Setup phase
- Install dependencies: `npm install`
- Start the app: `npm start`

## Build
- Electron-based build (applies to both Windows and macOS).

### Windows tool
- Folder build: `npm run pack`
- Installer: `npm run build`

### Mac tool
- macOS helper:
  - `./mac_diagtool_program_builder.sh`
  - Note: I made an auto builder for macOS, but I could not build it myself.

## Where the executables are
- Output folder: `dist/`
- Windows installer: `*.exe` (NSIS)
- macOS installer: `*.dmg`
- macOS builds are best done on macOS (I don’t have a Mac).
- Tests run before push; releases are on GitHub.
- The mac helper script generates `assets/icon-mac.icns` from `assets/icon-mac.png` before building.

## Credits
Source icons:
- Win98 icons: `http://toastytech.com/guis/win98.html`
- Apple AI article: `https://www.aicerts.ai/news/apple-ai-strategy-the-invisible-approach-wall-street-is-questioning/`

Sources:
- Stack Overflow 2025 tech: `https://survey.stackoverflow.co/2025/technology`
- Itransition languages: `https://www.itransition.com/developers/in-demand-programming-languages`
- Ari Santos languages 2025: `https://arisantos.co.uk/posts/10-most-popular-programming-languages-2025`
- MuchSkills tools: `https://www.muchskills.com/blog/top-software-technical-tools-muchskills`
- Crossover languages 2025: `https://www.crossover.com/resources/future-programming-languages-for-2025`
- Speedtest: `https://www.speedtest.net/`
