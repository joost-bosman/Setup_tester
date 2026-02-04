const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const https = require("https");

const DEFAULT_TEST_URL = "https://www.google.com/generate_204";

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 860,
    minHeight: 620,
    backgroundColor: "#0f1115",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "n/a";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

function ddmmyyStamp(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function timeRequest(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(url, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve({ ok: true, ms: Date.now() - start, status: res.statusCode }));
    });
    req.on("error", (err) => resolve({ ok: false, ms: Date.now() - start, error: err.message }));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ ok: false, ms: Date.now() - start, error: "timeout" });
    });
  });
}

function redactValue(value, redactions) {
  if (typeof value !== "string") return value;
  let result = value;
  redactions.forEach((item) => {
    if (!item) return;
    const escaped = item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "gi"), "[redacted]");
  });
  return result;
}

function redactObject(obj, redactions) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactObject(item, redactions));
  if (typeof obj === "object") {
    const next = {};
    Object.keys(obj).forEach((key) => {
      next[key] = redactObject(obj[key], redactions);
    });
    return next;
  }
  return redactValue(obj, redactions);
}

async function collectDiagnostics(options) {
  const mode = options?.mode || "quick";
  const privacy = options?.privacy || "private";
  const cpuInfo = os.cpus();
  const gpuInfo = await app.getGPUInfo("complete").catch(() => ({}));

  const diag = {
    timestamp: new Date().toISOString(),
    os: {
      platform: os.platform(),
      release: os.release(),
      version: os.version ? os.version() : "n/a",
      arch: os.arch(),
      hostname: os.hostname()
    },
    cpu: {
      model: cpuInfo?.[0]?.model || "n/a",
      cores: cpuInfo.length,
      speedMHz: cpuInfo?.[0]?.speed || "n/a",
      loadAvg: os.loadavg()
    },
    memory: {
      total: formatBytes(os.totalmem()),
      free: formatBytes(os.freemem())
    },
    internet: {}
  };

  if (mode === "full") {
    diag.gpu = {
      ...gpuInfo
    };
    diag.process = {
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  const internetCheck = await timeRequest(DEFAULT_TEST_URL);
  diag.internet = {
    testUrl: DEFAULT_TEST_URL,
    ok: internetCheck.ok,
    status: internetCheck.status || "n/a",
    latencyMs: internetCheck.ms,
    error: internetCheck.error || null
  };

  if (privacy === "public") {
    const redactions = [
      os.userInfo().username,
      os.hostname(),
      os.homedir(),
      process.env.USERPROFILE,
      process.env.HOME
    ].filter(Boolean);
    const redacted = redactObject(diag, redactions);
    if (redacted.os) {
      redacted.os.hostname = "[redacted]";
    }
    return redacted;
  }

  return diag;
}

ipcMain.handle("run-diagnostics", async (_event, options) => {
  const result = await collectDiagnostics(options);
  return result;
});

ipcMain.handle("export-results", async (event, payload) => {
  const { format, contentText, contentHtml } = payload;
  const stamp = ddmmyyStamp();
  const defaultName = `results_diagnostic_${stamp}.${format === "pdf" ? "pdf" : "txt"}`;
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save Diagnostics",
    defaultPath: path.join(app.getPath("documents"), defaultName),
    filters: format === "pdf"
      ? [{ name: "PDF", extensions: ["pdf"] }]
      : [{ name: "Text", extensions: ["txt"] }]
  });

  if (canceled || !filePath) return { saved: false };

  if (format === "txt") {
    await require("fs").promises.writeFile(filePath, contentText, "utf8");
    return { saved: true, path: filePath };
  }

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true }
  });

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 16px; }
          pre { white-space: pre-wrap; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Diagnostics Report</h1>
        <pre>${contentHtml}</pre>
      </body>
    </html>
  `;

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const pdfData = await printWindow.webContents.printToPDF({
    pageSize: "A4",
    marginsType: 1
  });
  await require("fs").promises.writeFile(filePath, pdfData);
  printWindow.close();
  return { saved: true, path: filePath };
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
