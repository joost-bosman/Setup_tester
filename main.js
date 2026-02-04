const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");

const windowIcon = process.platform === "darwin"
  ? path.join(__dirname, "assets", "icon-mac.png")
  : path.join(__dirname, "assets", "icon-win.png");

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 860,
    minHeight: 620,
    title: "Local Resource Diagnostic Tool",
    backgroundColor: "#0f1115",
    icon: windowIcon,
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

function getNetworkIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  Object.values(nets).forEach((entries) => {
    entries?.forEach((entry) => {
      if (!entry) return;
      if (entry.internal) return;
      if (entry.family === "IPv4") {
        ips.push(entry.address);
      }
    });
  });
  return ips;
}

function runPowerShellJson(script) {
  return new Promise((resolve) => {
    execFile(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { timeout: 8000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(null);
        }
      }
    );
  });
}

async function getWindowsCpuDetails() {
  const data = await runPowerShellJson(
    "Get-CimInstance Win32_Processor | Select-Object -First 1 Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors, CurrentClockSpeed, MaxClockSpeed, CurrentVoltage | ConvertTo-Json"
  );
  if (!data) return null;
  return {
    vendor: data.Manufacturer || null,
    model: data.Name || null,
    cores: data.NumberOfLogicalProcessors || data.NumberOfCores || null,
    currentClockMHz: data.CurrentClockSpeed || data.MaxClockSpeed || null,
    voltage: data.CurrentVoltage || null
  };
}

async function getWindowsMemoryModules() {
  const data = await runPowerShellJson(
    "Get-CimInstance Win32_PhysicalMemory | Select-Object Manufacturer, Capacity, Speed, ConfiguredVoltage | ConvertTo-Json"
  );
  if (!data) return [];
  const modules = Array.isArray(data) ? data : [data];
  return modules.map((mod) => ({
    vendor: mod.Manufacturer || null,
    capacityBytes: Number(mod.Capacity) || null,
    speedMHz: mod.Speed || null,
    voltage: mod.ConfiguredVoltage || null
  }));
}

async function getWindowsGpuDetails() {
  const data = await runPowerShellJson(
    "Get-CimInstance Win32_VideoController | Select-Object -First 1 Name, AdapterCompatibility, VideoProcessor | ConvertTo-Json"
  );
  if (!data) return null;
  return {
    vendor: data.AdapterCompatibility || null,
    chip: data.VideoProcessor || data.Name || null
  };
}

function extractVersion(output) {
  if (!output) return null;
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines[0] : null;
}

function checkCommand(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 6000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      const output = `${stdout || ""}\n${stderr || ""}`.trim();
      if (err && !output) {
        resolve({ ok: false, version: null });
        return;
      }
      resolve({ ok: true, version: extractVersion(output) });
    });
  });
}

async function collectCliTools() {
  const tools = [
    { name: "node", cmd: "node", args: ["-v"] },
    { name: "npm", cmd: "npm", args: ["-v"] },
    { name: "git", cmd: "git", args: ["--version"] },
    { name: "java", cmd: "java", args: ["-version"] },
    { name: "powershell", cmd: "powershell", args: ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"] }
  ];

  const results = {};
  for (const tool of tools) {
    results[tool.name] = await checkCommand(tool.cmd, tool.args);
  }
  return results;
}

function parseXmxValue(text) {
  if (!text) return null;
  const match = text.match(/-Xmx(\d+)([mMgG])/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2].toLowerCase();
  return unit === "g" ? value * 1024 : value;
}

function detectJetBrainsIdeCaps() {
  const roots = [];
  if (process.env.APPDATA) {
    roots.push(path.join(process.env.APPDATA, "JetBrains"));
  }
  if (process.env.LOCALAPPDATA) {
    roots.push(path.join(process.env.LOCALAPPDATA, "JetBrains"));
    roots.push(path.join(process.env.LOCALAPPDATA, "JetBrains", "Toolbox", "apps"));
  }

  const ideCaps = [];
  const seen = new Set();

  const scanDir = (dir, depth = 0) => {
    if (depth > 5) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(full, depth + 1);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".vmoptions")) continue;
      if (seen.has(full)) continue;
      seen.add(full);
      let content;
      try {
        content = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      const xmxMb = parseXmxValue(content);
      if (!xmxMb) continue;
      const product = entry.name.replace(/\.vmoptions$/i, "");
      ideCaps.push({
        product,
        xmxMb,
        path: full
      });
    }
  };

  roots.forEach((root) => scanDir(root));
  return ideCaps;
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

function detectGpuVendor(model) {
  if (!model || typeof model !== "string") return null;
  const name = model.toLowerCase();
  if (name.includes("nvidia")) return { name: "NVIDIA", url: "https://www.nvidia.com/" };
  if (name.includes("amd") || name.includes("radeon")) return { name: "AMD", url: "https://www.amd.com/" };
  if (name.includes("intel")) return { name: "Intel", url: "https://www.intel.com/" };
  if (name.includes("apple")) return { name: "Apple", url: "https://www.apple.com/" };
  return null;
}

function summarizeGpu(gpuInfo) {
  const device =
    gpuInfo?.gpuDevice?.[0] ||
    gpuInfo?.graphics?.[0] ||
    gpuInfo?.graphics?.[0]?.devices?.[0] ||
    null;

  const name =
    device?.deviceString ||
    device?.vendorString ||
    device?.name ||
    device?.device ||
    "n/a";

  const vendor = detectGpuVendor(name);
  return {
    name,
    vendorId: device?.vendorId || device?.vendor_id || null,
    deviceId: device?.deviceId || device?.device_id || null,
    driverVersion: device?.driverVersion || device?.driver_version || null,
    vendorLink: vendor?.url || null
  };
}

function checkMacOsUpdates() {
  return new Promise((resolve) => {
    execFile("softwareupdate", ["-l"], { timeout: 12000 }, (err, stdout, stderr) => {
      const output = `${stdout || ""}\n${stderr || ""}`.toLowerCase();
      if (output.includes("no new software available") || output.includes("no updates are available")) {
        resolve({ status: "up_to_date" });
        return;
      }
      if (err && !output.trim()) {
        resolve({ status: "unknown", error: err.message });
        return;
      }
      resolve({ status: "updates_available" });
    });
  });
}

async function collectDiagnostics(options) {
  const mode = options?.mode || "quick";
  const privacy = options?.privacy || "private";
  const cpuInfo = os.cpus();
  const gpuInfo = await app.getGPUInfo("complete").catch(() => ({}));
  const macUpdate =
    process.platform === "darwin" ? await checkMacOsUpdates().catch(() => ({ status: "unknown" })) : null;
  const ips = getNetworkIps();
  const windowsCpu = process.platform === "win32" ? await getWindowsCpuDetails() : null;
  const windowsMemoryModules = process.platform === "win32" ? await getWindowsMemoryModules() : [];
  const windowsGpu = process.platform === "win32" ? await getWindowsGpuDetails() : null;
  const ideCaps = detectJetBrainsIdeCaps();
  const intellijCap = ideCaps.find((entry) => /intellij|idea/i.test(entry.product)) || null;
  const alternativeCaps = ideCaps.filter((entry) => !/intellij|idea/i.test(entry.product));
  const cliTools = mode === "cli" ? await collectCliTools() : null;

  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;
  const speeds = cpuInfo.map((cpu) => cpu.speed).filter((speed) => Number.isFinite(speed));
  const totalSpeedMHz = speeds.reduce((sum, speed) => sum + speed, 0);
  const totalSpeedGHz = totalSpeedMHz ? totalSpeedMHz / 1000 : null;

  const diag = {
    timestamp: new Date().toISOString(),
    os: {
      platform: os.platform(),
      release: os.release(),
      version: os.version ? os.version() : "n/a",
      arch: os.arch(),
      hostname: os.hostname(),
      ip: ips,
      updateStatus: macUpdate?.status || "n/a"
    },
    cpu: {
      vendor: windowsCpu?.vendor || null,
      model: windowsCpu?.model || cpuInfo?.[0]?.model || "n/a",
      cores: windowsCpu?.cores || cpuInfo.length,
      totalSpeedMHz: totalSpeedMHz || null,
      totalSpeedGHz: totalSpeedGHz ? Number(totalSpeedGHz.toFixed(2)) : null,
      voltage: windowsCpu?.voltage || null,
      loadAvg: os.loadavg()
    },
    memory: {
      total: formatBytes(totalMemBytes),
      used: formatBytes(usedMemBytes),
      free: formatBytes(freeMemBytes),
      moduleVendors: Array.from(
        new Set(windowsMemoryModules.map((mod) => mod.vendor).filter(Boolean))
      ),
      modules: windowsMemoryModules,
      intellijCapMb: intellijCap?.xmxMb || null,
      alternativeIdeCaps: alternativeCaps.map((entry) => ({
        product: entry.product,
        xmxMb: entry.xmxMb
      }))
    },
    app: {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      javaHome: process.env.JAVA_HOME || null
    },
    internet: {}
  };

  diag.gpu = {
    vendor: windowsGpu?.vendor || detectGpuVendor(summarizeGpu(gpuInfo).name)?.name || null,
    chip: windowsGpu?.chip || summarizeGpu(gpuInfo).name || null,
    cores: null,
    speedMHz: null,
    speedGHz: null,
    voltage: null
  };

  if (mode === "full") {
    diag.process = {
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  if (mode === "cli") {
    diag.cli = cliTools;
  }

  const speedtest = await runSpeedtestNet().catch((err) => ({
    ok: false,
    error: err.message || String(err)
  }));
  diag.internet = {
    testUrl: "https://www.speedtest.net/",
    ok: speedtest.ok,
    downloadMbps: speedtest.downloadMbps || null,
    uploadMbps: speedtest.uploadMbps || null,
    pingMs: speedtest.pingMs || null,
    error: speedtest.error || null
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
      redacted.os.ip = Array.isArray(redacted.os.ip) ? redacted.os.ip.map(() => "[redacted]") : "[redacted]";
    }
    return redacted;
  }

  return diag;
}

function runSpeedtestNet() {
  return new Promise((resolve) => {
    const speedWindow = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      backgroundColor: "#0f1115",
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false
      }
    });

    speedWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    const timeout = setTimeout(() => {
      speedWindow.close();
      resolve({ ok: false, error: "speedtest timeout" });
    }, 60000);

    const pollResults = async () => {
      try {
        const data = await speedWindow.webContents.executeJavaScript(
          `
          (() => {
            const pick = (selectors) => {
              for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el && el.textContent) return el.textContent.trim();
              }
              return null;
            };
            const download = pick([".download-speed", "span.download-speed", "[data-testid='download-speed']"]);
            const upload = pick([".upload-speed", "span.upload-speed", "[data-testid='upload-speed']"]);
            const ping = pick([".ping-speed", "span.ping-speed", "[data-testid='ping-speed']"]);
            return { download, upload, ping };
          })()
        `,
          true
        );

        if (data?.download && data?.upload && data?.ping) {
          clearTimeout(timeout);
          speedWindow.close();
          const toNumber = (value) => {
            const num = Number(String(value).replace(/[^\d.]/g, ""));
            return Number.isFinite(num) ? num : null;
          };
          resolve({
            ok: true,
            downloadMbps: toNumber(data.download),
            uploadMbps: toNumber(data.upload),
            pingMs: toNumber(data.ping)
          });
          return;
        }
      } catch {
        // keep polling
      }
      setTimeout(pollResults, 1000);
    };

    speedWindow.webContents.on("did-finish-load", async () => {
      try {
        await speedWindow.webContents.executeJavaScript(
          `
          (() => {
            const clickAny = (selectors) => {
              for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) { el.click(); return true; }
              }
              return false;
            };
            clickAny(["#onetrust-accept-btn-handler", "button#accept-privacy", "button.accept"]);
            clickAny([".start-text", ".start-button a", ".start-button", "[data-testid='start-button']"]);
          })()
        `,
          true
        );
      } catch {
        // ignore
      }
      pollResults();
    });

    speedWindow.loadURL("https://www.speedtest.net/");
  });
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



