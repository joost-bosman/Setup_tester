# Local Resource Diagnostic Tool (Electron)

Small Windows + macOS diagnostics app with privacy controls and export.

## Run
1. Install dependencies:
   - `npm install`
2. Start the app:
   - `npm start`

## Features
- Quick or full diagnostics
- Privacy mode: private (default) or public (redacted)
- Export results to TXT or PDF
- Timestamped filenames: `results_diagnostic_DDMMYY`

## Notes
- Public mode redacts username, hostname, and home paths.
- Internet check measures request latency to a public endpoint.
