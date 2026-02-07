const { app, BrowserWindow, dialog, ipcMain, screen } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const https = require("https");
const { formatCsvExport } = require("./lib/csv-utils");
const { isNetworkPath } = require("./lib/path-utils");
const { summarizeSpeedtestResults } = require("./lib/speedtest-utils");

const windowIcon = process.platform === "darwin"
  ? path.join(__dirname, "assets", "icon-mac.png")
  : path.join(__dirname, "assets", "icon-win.png");

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workArea;
  const width = Math.min(1100, Math.max(900, Math.floor(workArea.width * 0.85)));
  const height = Math.min(820, Math.max(640, Math.floor(workArea.height * 0.85)));
  const win = new BrowserWindow({
    width,
    height,
    minWidth: 860,
    minHeight: 620,
    title: "Setup_tester",
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

function parseSizeToBytes(value) {
  if (!value) return null;
  const match = String(value).match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return null;
  const unit = match[2].toUpperCase();
  const base = 1024;
  if (unit === "TB") return Math.round(num * base ** 4);
  if (unit === "GB") return Math.round(num * base ** 3);
  if (unit === "MB") return Math.round(num * base ** 2);
  if (unit === "KB") return Math.round(num * base);
  return Math.round(num);
}

function timestampStamp(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}_${hh}-${min}-${ss}`;
}

function buildBaselineSnapshot(diag) {
  return {
    os: {
      platform: diag?.os?.platform ?? null,
      release: diag?.os?.release ?? null,
      version: diag?.os?.version ?? null,
      arch: diag?.os?.arch ?? null
    },
    cpu: {
      model: diag?.cpu?.model ?? null,
      cores: diag?.cpu?.cores ?? null,
      totalSpeedGHz: diag?.cpu?.totalSpeedGHz ?? null
    },
    memory: {
      total: diag?.memory?.total ?? null,
      free: diag?.memory?.free ?? null
    },
    gpu: {
      vendor: diag?.gpu?.vendor ?? null,
      chip: diag?.gpu?.chip ?? null
    },
    app: {
      version: diag?.app?.version ?? null,
      electron: diag?.app?.electron ?? null,
      node: diag?.app?.node ?? null,
      chrome: diag?.app?.chrome ?? null
    },
    internet: {
      downloadMbps: diag?.internet?.downloadMbps ?? null,
      uploadMbps: diag?.internet?.uploadMbps ?? null,
      pingMs: diag?.internet?.pingMs ?? null
    }
  };
}

function flattenSnapshot(obj, prefix = "", out = []) {
  if (!obj || typeof obj !== "object") return out;
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flattenSnapshot(value, pathKey, out);
      return;
    }
    out.push({ path: pathKey, value });
  });
  return out;
}

function compareSnapshots(baseline, current) {
  const base = buildBaselineSnapshot(baseline);
  const now = buildBaselineSnapshot(current);
  const baseFlat = flattenSnapshot(base);
  const nowFlat = flattenSnapshot(now);
  const lookup = new Map(nowFlat.map((entry) => [entry.path, entry.value]));
  const normalizeForCompare = (value) => {
    if (value === null || value === undefined || value === "") {
      return { compare: "n/a", display: "n/a" };
    }
    if (Number.isFinite(value)) {
      return { compare: value, display: value };
    }
    const text = String(value);
    const bytes = parseSizeToBytes(text);
    if (Number.isFinite(bytes)) {
      return { compare: bytes, display: text };
    }
    return { compare: text, display: text };
  };
  const changes = [];
  baseFlat.forEach((entry) => {
    const nextVal = lookup.get(entry.path);
    const before = normalizeForCompare(entry.value);
    const after = normalizeForCompare(nextVal);
    if (before.compare !== after.compare) {
      changes.push({ path: entry.path, before: before.display, after: after.display });
    }
  });
  return changes;
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

function runCommand(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 120000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        resolve({
          ok: false,
          output: `${stdout || ""}\n${stderr || ""}`.trim() || err.message
        });
        return;
      }
      resolve({ ok: true, output: `${stdout || ""}\n${stderr || ""}`.trim() });
    });
  });
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

function parseKeyValueLines(text) {
  if (!text) return null;
  const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const data = {};
  lines.forEach((line) => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) return;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    data[key] = value;
  });
  return Object.keys(data).length ? data : null;
}

async function getWindowsNetworkAdapters() {
  const script = `
    $adapters = Get-NetAdapter | Select-Object Name, Status, LinkSpeed, InterfaceDescription;
    $ipconfig = Get-NetIPConfiguration | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway, DNSServer;
    [pscustomobject]@{ adapters = $adapters; ipconfig = $ipconfig } | ConvertTo-Json -Depth 4
  `;
  const data = await runPowerShellJson(script);
  if (!data) return null;
  return data;
}

async function getWindowsWifiInfo() {
  const script = `
    $adapter = Get-NetAdapter -PhysicalMediaType Native 802.11 -ErrorAction SilentlyContinue | Select-Object -First 1;
    $hasAdapter = $null -ne $adapter;
    $status = if ($adapter) { $adapter.Status } else { $null };
    $ssidBytes = Get-CimInstance -Namespace root\\wmi -ClassName MSNdis_80211_ServiceSetIdentifier -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty Ndis80211SsId;
    if (-not $ssidBytes) {
      $ssidBytes = Get-WmiObject -Namespace root\\wmi -Class MSNdis_80211_ServiceSetIdentifier -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty Ndis80211SsId;
    }
    $ssid = $null;
    if ($ssidBytes) { $ssid = [System.Text.Encoding]::ASCII.GetString($ssidBytes).Trim([char]0) }
    $signal = Get-CimInstance -Namespace root\\wmi -ClassName MSNdis_80211_ReceivedSignalStrength -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty Ndis80211ReceivedSignalStrength;
    if (-not $signal) {
      $signal = Get-WmiObject -Namespace root\\wmi -Class MSNdis_80211_ReceivedSignalStrength -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty Ndis80211ReceivedSignalStrength;
    }
    [pscustomobject]@{ hasAdapter = $hasAdapter; ssid = $ssid; state = $status; signal = $signal } | ConvertTo-Json
  `;
  const data = await runPowerShellJson(script);
  if (!data) {
    return { errorCode: "note.wifi.unavailable", error: "Wi-Fi info unavailable." };
  }
  if (data.hasAdapter === false) {
    return { errorCode: "note.wifi.unavailable", error: "No Wi-Fi adapter detected." };
  }
  const ssid = data.ssid && String(data.ssid).trim() ? data.ssid : null;
  const signalValue = Number(data.signal);
  const hasUsefulData = Boolean(ssid || data.state || Number.isFinite(signalValue));
  if (!hasUsefulData) {
    return { errorCode: "note.wifi.unavailable", error: "Wi-Fi info unavailable." };
  }
  return {
    ssid,
    state: data.state || null,
    signal: Number.isFinite(signalValue) ? `${signalValue}%` : null,
    radio: null,
    errorCode: null,
    error: null
  };
}

async function getWindowsPowerPlan() {
  const res = await runCommand("powercfg", ["/getactivescheme"]);
  if (!res.ok) return null;
  const match = res.output.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : res.output.trim();
}

async function getWindowsDefaultGateway() {
  const script = `
    Get-NetRoute -DestinationPrefix "0.0.0.0/0" |
      Sort-Object RouteMetric |
      Select-Object -First 1 NextHop |
      ConvertTo-Json
  `;
  const data = await runPowerShellJson(script);
  if (!data) return null;
  if (typeof data === "string") return data;
  return data.NextHop || data.nextHop || null;
}

async function getMacWifiInfo() {
  const airportPath = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport";
  if (!fs.existsSync(airportPath)) return null;
  const res = await runCommand(airportPath, ["-I"]);
  if (!res.ok) return null;
  const parsed = parseKeyValueLines(res.output);
  if (!parsed) return null;
  return {
    ssid: parsed.ssid || null,
    state: parsed.state || null,
    signal: parsed["agrctlrssi"] || null,
    noise: parsed["agrctlnoise"] || null,
    rate: parsed["lasttxrate"] || null
  };
}

async function getMacNetworkPorts() {
  const res = await runCommand("networksetup", ["-listallhardwareports"]);
  if (!res.ok) return null;
  const blocks = res.output.split(/\r?\n\r?\n/);
  const ports = [];
  blocks.forEach((block) => {
    const port = {};
    block.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (!match) return;
      const key = match[1].trim();
      const value = match[2].trim();
      if (key === "Hardware Port") port.name = value;
      if (key === "Device") port.device = value;
    });
    if (port.name || port.device) ports.push(port);
  });
  return ports.length ? ports : null;
}

async function getMacPowerSummary() {
  const res = await runCommand("pmset", ["-g"]);
  if (!res.ok) return null;
  const lines = res.output.split(/\r?\n/).filter(Boolean).slice(0, 3);
  return lines.join(" | ");
}

async function getMacDefaultGateway() {
  const res = await runCommand("route", ["-n", "get", "default"]);
  if (!res.ok) return null;
  const match = res.output.match(/gateway:\s+([^\s]+)/);
  return match ? match[1] : null;
}

async function getWindowsCpuDetails() {
  const data = await runPowerShellJson(
    "Get-CimInstance Win32_Processor | Select-Object Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors, CurrentClockSpeed, MaxClockSpeed, CurrentVoltage | ConvertTo-Json"
  );
  if (!data) return null;
  const list = Array.isArray(data) ? data : [data];
  const primary = list[0] || {};
  return {
    vendor: primary.Manufacturer || null,
    model: primary.Name || null,
    cores: primary.NumberOfLogicalProcessors || primary.NumberOfCores || null,
    currentClockMHz: primary.CurrentClockSpeed || primary.MaxClockSpeed || null,
    voltage: primary.CurrentVoltage || null,
    packageCount: list.length,
    packages: list.map((cpu) => cpu.Name).filter(Boolean)
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
    "Get-CimInstance Win32_VideoController | Select-Object Name, AdapterCompatibility, VideoProcessor | ConvertTo-Json"
  );
  if (!data) return null;
  const list = Array.isArray(data) ? data : [data];
  const primary = list[0] || {};
  return {
    vendor: primary.AdapterCompatibility || null,
    chip: primary.VideoProcessor || primary.Name || null,
    deviceCount: list.length,
    devices: list
      .map((gpu) => gpu.VideoProcessor || gpu.Name || gpu.AdapterCompatibility)
      .filter(Boolean)
  };
}

function extractVersion(output) {
  if (!output) return null;
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines[0] : null;
}

function parseSizeToGb(value) {
  if (!value) return null;
  const match = String(value).match(/([\d.]+)\s*(TB|GB|MB)/i);
  if (!match) return null;
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return null;
  const unit = match[2].toUpperCase();
  if (unit === "TB") return num * 1024;
  if (unit === "MB") return num / 1024;
  return num;
}

function computeHealthScore(diag, approach = "extensive") {
  let score = 100;
  const missingDeps = Array.isArray(diag?.dependencies)
    ? diag.dependencies.filter((item) => !item.present).map((item) => item.name)
    : [];
  const missingSoftware = Array.isArray(diag?.software)
    ? diag.software.filter((item) => !item.present).map((item) => item.name)
    : [];
  const cliEntries = diag?.cli ? Object.entries(diag.cli) : [];
  const missingCliCount = cliEntries.filter(([, info]) => info?.ok === false).length;
  const totalGb = parseSizeToGb(diag?.memory?.total);
  const pingMs = Number(diag?.internet?.pingMs);
  const downloadMbps = Number(diag?.internet?.downloadMbps);

  score -= Math.min(30, missingDeps.length * 5);
  score -= Math.min(10, missingSoftware.length * 2);
  score -= Math.min(15, missingCliCount * 3);

  if (Number.isFinite(totalGb)) {
    if (totalGb < 8) score -= 15;
    else if (totalGb < 16) score -= 8;
  }

  if (approach !== "brief") {
    if (diag?.internet?.ok === false) score -= 10;
    if (Number.isFinite(pingMs) && pingMs > 100) score -= 5;
    if (Number.isFinite(downloadMbps) && downloadMbps > 0 && downloadMbps < 25) score -= 5;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

function getSuggestionsPlain(diag, approach = "extensive") {
  const suggestions = [];
  if (!diag) return suggestions;
  const addSuggestion = (text) => {
    if (!suggestions.includes(text)) suggestions.push(text);
  };

  if (approach === "brief") {
    addSuggestion("Run the brief checklist and fix the top priorities.");
  } else {
    addSuggestion("Run the extensive checklist and fix the top priorities.");
  }

  const platform = diag?.os?.platform;
  const installedSoftwareEntries = (diag?.software || []).filter((item) => item?.present);
  const installedSoftware = installedSoftwareEntries.map((item) => String(item.name || "").toLowerCase());
  const hasSoftware = (needle) => installedSoftware.some((name) => name.includes(needle));
  const hasSoftwareExact = (name) =>
    installedSoftwareEntries.some((item) => String(item.name || "") === name);
  const installedDeps = (diag?.dependencies || [])
    .filter((item) => item?.present)
    .map((item) => String(item.name || "").toLowerCase());
  const hasDependency = (needle) => installedDeps.some((name) => name.includes(needle));

  const totalMem = Number(diag?.memory?.total?.replace(/[^\d.]/g, ""));
  const freeMem = Number(diag?.memory?.free?.replace(/[^\d.]/g, ""));
  if (Number.isFinite(totalMem) && Number.isFinite(freeMem) && totalMem > 0) {
    const freeRatio = freeMem / totalMem;
    const usedRatio = 1 - freeRatio;
    if (freeRatio < 0.2) addSuggestion("Memory is low: close heavy apps or add RAM.");
    if (usedRatio >= 0.9) addSuggestion("Memory usage is very high: reduce background apps.");
    else if (usedRatio >= 0.8) addSuggestion("Memory usage is high: trim startup apps.");
    addSuggestion("Reserve memory for active work (browser, IDE, build tools).");
  }

  const loadAvg = diag?.cpu?.loadAvg;
  const cores = Number(diag?.cpu?.cores);
  if (Array.isArray(loadAvg) && loadAvg.length > 0 && Number.isFinite(cores)) {
    if (loadAvg[0] > cores) addSuggestion("CPU load is high: check background tasks.");
  }

  const latency = Number(diag?.internet?.pingMs);
  if (diag?.internet?.ok === false) {
    addSuggestion("Internet test failed: retry on a stable connection.");
  } else if (Number.isFinite(latency) && latency > 200) {
    addSuggestion("High internet latency: check router and DNS.");
  }

  if (diag?.os?.updateStatus === "updates_available") {
    addSuggestion("OS updates are available: install them.");
  }

  if (!diag?.gpu) {
    addSuggestion("GPU details are missing: check drivers.");
  }

  if (Number.isFinite(diag?.memory?.intellijCapMb) || (diag?.memory?.alternativeIdeCaps || []).length > 0) {
    addSuggestion("IDE memory caps detected: tune them for large projects.");
  }

  const wifiSignal = diag?.network?.wifi?.signal;
  if (wifiSignal) {
    const signalText = String(wifiSignal);
    const percentMatch = signalText.match(/(\d+)\s*%/);
    if (percentMatch && Number(percentMatch[1]) < 60) addSuggestion("Wi-Fi signal is weak.");
    const rssi = Number(signalText.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(rssi) && rssi < 0 && rssi <= -70) addSuggestion("Wi-Fi RSSI is weak.");
  }

  const powerPlan = String(diag?.systemSettings?.powerPlan || diag?.systemSettings?.powerSummary || "");
  if (platform === "win32" && powerPlan && /balanced|power saver|power saving/i.test(powerPlan)) {
    addSuggestion("Power plan is not high performance: switch if needed.");
  }

  if (hasSoftware("visual studio code")) addSuggestion("Review VS Code extensions and keep them lean.");
  const hasJetBrainsIde =
    hasSoftware("intellij") ||
    hasSoftware("pycharm") ||
    hasSoftware("webstorm") ||
    hasSoftware("rider") ||
    hasSoftware("clion") ||
    hasSoftware("datagrip") ||
    hasSoftware("android studio");
  if (hasJetBrainsIde) addSuggestion("Tune JetBrains IDE settings (indexes, memory, plugins).");
  if (hasSoftwareExact("Visual Studio")) addSuggestion("Enable parallel builds in Visual Studio.");
  if (hasSoftware("xcode")) addSuggestion("Clear Xcode DerivedData regularly.");
  if (hasSoftware("android studio")) addSuggestion("Enable hardware acceleration for Android emulators.");

  if (hasDependency("javascript") || hasDependency("node")) addSuggestion("Use Node LTS for stability.");
  if (hasDependency("typescript")) addSuggestion("Enable TypeScript incremental builds.");
  if (hasDependency("python")) addSuggestion("Use Python virtual environments per project.");
  if (hasDependency("java")) addSuggestion("Use a current Java LTS version.");
  if (hasDependency("docker")) {
    addSuggestion(platform === "win32" ? "Tune Docker Desktop resources on Windows." : "Tune Docker resources on macOS.");
  }

  let finalSuggestions = suggestions;
  if (approach === "brief") finalSuggestions = suggestions.slice(0, 4);

  if (approach === "extensive") {
    const checklist = [
      "Update OS drivers",
      "Review power plan",
      "Trim startup apps",
      "Free disk space",
      "Use SSD where possible",
      "Reduce heavy visual effects",
      "Review antivirus impact",
      "Improve Wi-Fi stability",
      "Check DNS settings",
      "Tune browser performance",
      "Enable hardware acceleration",
      "Verify CLI tools",
      "Reboot after updates"
    ];
    finalSuggestions = finalSuggestions.concat(checklist);
  }

  if (approach === "extensive" && finalSuggestions.length) {
    const impact = Math.min(30, 5 + finalSuggestions.length * 3);
    finalSuggestions = [
      ...finalSuggestions,
      `Potential improvement: ${impact}-${Math.min(40, impact + 10)}%`
    ];
  }

  if (finalSuggestions.length === 0) finalSuggestions.push("No major issues detected.");
  return finalSuggestions;
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

function checkAnyPaths(paths) {
  return paths.some((p) => {
    if (!p) return false;
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
}

function getWindowsSoftwareList() {
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const localApp = process.env.LOCALAPPDATA || "";

  return [
    { name: "Visual Studio Code", paths: [path.join(programFiles, "Microsoft VS Code", "Code.exe")] },
    { name: "Visual Studio", paths: [path.join(programFiles, "Microsoft Visual Studio")] },
    { name: "IntelliJ IDEA", paths: [path.join(programFiles, "JetBrains"), path.join(localApp, "JetBrains", "Toolbox", "apps", "IDEA")] },
    { name: "Android Studio", paths: [path.join(programFiles, "Android", "Android Studio", "bin", "studio64.exe")] },
    { name: "PyCharm", paths: [path.join(programFiles, "JetBrains"), path.join(localApp, "JetBrains", "Toolbox", "apps", "PyCharm")] },
    { name: "WebStorm", paths: [path.join(programFiles, "JetBrains"), path.join(localApp, "JetBrains", "Toolbox", "apps", "WebStorm")] },
    { name: "Rider", paths: [path.join(programFiles, "JetBrains"), path.join(localApp, "JetBrains", "Toolbox", "apps", "Rider")] },
    { name: "Eclipse", paths: [path.join(programFiles, "eclipse"), path.join(programFilesX86, "eclipse")] },
    { name: "CLion", paths: [path.join(programFiles, "JetBrains"), path.join(localApp, "JetBrains", "Toolbox", "apps", "CLion")] },
    { name: "DataGrip", paths: [path.join(programFiles, "JetBrains"), path.join(localApp, "JetBrains", "Toolbox", "apps", "DataGrip")] }
  ];
}

function getMacSoftwareList() {
  return [
    { name: "Visual Studio Code", paths: ["/Applications/Visual Studio Code.app"] },
    { name: "Xcode", paths: ["/Applications/Xcode.app"] },
    { name: "IntelliJ IDEA", paths: ["/Applications/IntelliJ IDEA.app", "/Applications/IntelliJ IDEA CE.app"] },
    { name: "Android Studio", paths: ["/Applications/Android Studio.app"] },
    { name: "PyCharm", paths: ["/Applications/PyCharm.app", "/Applications/PyCharm CE.app"] },
    { name: "WebStorm", paths: ["/Applications/WebStorm.app"] },
    { name: "Rider", paths: ["/Applications/Rider.app"] },
    { name: "CLion", paths: ["/Applications/CLion.app"] },
    { name: "DataGrip", paths: ["/Applications/DataGrip.app"] },
    { name: "Sublime Text", paths: ["/Applications/Sublime Text.app"] }
  ];
}

async function getDependenciesList() {
  const sqlCommands = process.platform === "win32"
    ? ["sqlcmd", "sqlite3", "psql", "mysql"]
    : ["psql", "mysql", "sqlite3"];
  const nodeCommand = "node";
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  const items = [
    { name: "Python", commands: ["python", "python3"] },
    { name: "JavaScript (Node.js)", commands: [nodeCommand] },
    { name: "TypeScript", commands: ["tsc"] },
    { name: "Java", commands: ["java"] },
    { name: "SQL tools", commands: sqlCommands },
    { name: "Git", commands: ["git"] },
    { name: "GitHub CLI", commands: ["gh"] },
    { name: "Docker", commands: ["docker"] },
    { name: "Visual Studio Code CLI", commands: ["code"] },
    { name: "IntelliJ CLI", commands: ["idea"] }
  ];

  const results = [];
  for (const item of items) {
    let found = false;
    let version = null;
    for (const cmd of item.commands) {
      // eslint-disable-next-line no-await-in-loop
      const res = await checkCommand(cmd, ["--version"]);
      if (res.ok) {
        found = true;
        version = res.version;
        break;
      }
    }
    results.push({ name: item.name, present: found, version });
  }
  return results;
}

async function collectCliTools() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const tools = [
    { name: "node", cmd: "node", args: ["-v"] },
    { name: "npm", cmd: npmCmd, args: ["-v"] },
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
  const approach = options?.approach || "brief";
  const isExtensive = approach === "extensive";
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
  const cliTools = await collectCliTools();
  const includeSoftware = options?.includeSoftware !== false; // optional software scan
  const includeDependencies = options?.includeDependencies !== false; // optional tools/languages scan
  const softwareList = process.platform === "darwin" ? getMacSoftwareList() : getWindowsSoftwareList();
  const software = includeSoftware
    ? softwareList.map((item) => ({
        name: item.name,
        present: checkAnyPaths(item.paths)
      }))
    : [];
  const dependencies = includeDependencies ? await getDependenciesList() : [];

  const totalMemBytes = os.totalmem();
  const freeMemBytes = os.freemem();
  const usedMemBytes = totalMemBytes - freeMemBytes;
  const speeds = cpuInfo.map((cpu) => cpu.speed).filter((speed) => Number.isFinite(speed));
  const totalSpeedMHz = speeds.reduce((sum, speed) => sum + speed, 0);
  const totalSpeedGHz = totalSpeedMHz ? totalSpeedMHz / 1000 : null;
  const gpuDevices = Array.isArray(gpuInfo?.gpuDevice)
    ? gpuInfo.gpuDevice.map((device) => device.deviceString || device.name).filter(Boolean)
    : [];

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
      packageCount: windowsCpu?.packageCount || null,
      packages: windowsCpu?.packages || null,
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
    driverVersion: windowsGpu?.driverVersion || null,
    deviceCount: windowsGpu?.deviceCount || (gpuDevices.length || null),
    devices: windowsGpu?.devices || (gpuDevices.length ? gpuDevices : null),
    cores: null,
    speedMHz: null,
    speedGHz: null,
    voltage: null
  };

  if (mode === "full" || approach === "extensive") {
    diag.process = {
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  diag.cli = cliTools;
  diag.software = software;
  diag.dependencies = dependencies;

  const shouldRunSpeedtest = isExtensive || mode === "full";
  if (shouldRunSpeedtest) {
    const speedtest = await runSpeedtestNet().catch((err) => ({
      ok: false,
      error: err.message || String(err)
    }));
    diag.internet = {
      testUrl: "https://speed.fastly.com/ + https://speedtest.akamai.com/",
      ok: speedtest.ok,
      downloadMbps: speedtest.downloadMbps || null,
      uploadMbps: speedtest.uploadMbps || null,
      pingMs: speedtest.pingMs || null,
      error: speedtest.error || null,
      errorCode: speedtest.errorCode || null,
      note: speedtest.note || null,
      noteCode: speedtest.noteCode || null,
      sources: speedtest.sources || null,
      sourceCount: speedtest.sourceCount || null
    };
  } else {
    diag.internet = {
      testUrl: "https://speed.fastly.com/ + https://speedtest.akamai.com/",
      ok: null,
      downloadMbps: null,
      uploadMbps: null,
      pingMs: null,
      error: "Skipped in brief mode",
      errorCode: "note.skipped",
      note: null,
      noteCode: null,
      sources: null,
      sourceCount: null
    };
  }

  if (isExtensive) {
    const [wifiInfo, powerPlan, gateway, macPorts, winAdapters] = await Promise.all([
      process.platform === "darwin" ? getMacWifiInfo() : getWindowsWifiInfo(),
      process.platform === "darwin" ? getMacPowerSummary() : getWindowsPowerPlan(),
      process.platform === "darwin" ? getMacDefaultGateway() : getWindowsDefaultGateway(),
      process.platform === "darwin" ? getMacNetworkPorts() : Promise.resolve(null),
      process.platform === "win32" ? getWindowsNetworkAdapters() : Promise.resolve(null)
    ]);

    const lanStatus = (() => {
      if (process.platform === "win32" && winAdapters?.adapters) {
        const list = Array.isArray(winAdapters.adapters) ? winAdapters.adapters : [winAdapters.adapters];
        const lan = list.find((item) => /ethernet|lan/i.test(item.Name || item.InterfaceDescription || ""));
        return lan
          ? { status: lan.Status || "n/a", speed: lan.LinkSpeed || "n/a" }
          : { status: "n/a", speed: "n/a" };
      }
      if (process.platform === "darwin" && Array.isArray(macPorts)) {
        const lan = macPorts.find((item) => /ethernet/i.test(item.name || ""));
        return lan ? { status: "available", speed: "n/a" } : { status: "n/a", speed: "n/a" };
      }
      return { status: "n/a", speed: "n/a" };
    })();

    diag.network = {
      wifi: wifiInfo || null,
      lan: lanStatus,
      adapters: winAdapters?.adapters || macPorts || null,
      ipconfig: winAdapters?.ipconfig || null,
      router: {
        gateway: gateway || "n/a",
        firmware: "not available"
      }
    };

    diag.systemSettings = {
      powerPlan: powerPlan || null,
      powerSummary: powerPlan || null
    };
  }

  return diag;
}

function runSpeedtestNet() {
  const measurePing = (url, timeoutMs) =>
    new Promise((resolve) => {
      const start = process.hrtime.bigint();
      const req = https.request(url, { method: "GET" }, (res) => {
        res.on("data", () => {});
        res.on("end", () => {
          const end = process.hrtime.bigint();
          const ms = Number(end - start) / 1e6;
          resolve({ ms: Number.isFinite(ms) ? ms : null, captive: false });
        });
      });
      req.on("error", () => resolve({ ms: null, captive: false }));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve({ ms: null, captive: false });
      });
      req.end();
    });

  const measureDownload = (url, bytes, timeoutMs) =>
    new Promise((resolve) => {
      const start = process.hrtime.bigint();
      let total = 0;
      const req = https.request(
        url,
        { method: "GET", headers: { Range: `bytes=0-${bytes - 1}` } },
        (res) => {
          const contentType = String(res.headers["content-type"] || "");
          const isCaptive = Boolean(
            (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) ||
            contentType.toLowerCase().includes("text/html")
          );
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            res.resume();
            resolve({ mbps: null, captive: isCaptive });
            return;
          }
          res.on("data", (chunk) => {
            total += chunk.length;
          });
          res.on("end", () => {
            const end = process.hrtime.bigint();
            const seconds = Number(end - start) / 1e9;
            if (!Number.isFinite(seconds) || seconds <= 0) {
              resolve({ mbps: null, captive: isCaptive });
              return;
            }
            const mbps = (total * 8) / seconds / 1e6;
            resolve({ mbps: Number.isFinite(mbps) ? mbps : null, captive: isCaptive });
          });
        }
      );
      req.on("error", () => resolve({ mbps: null, captive: false }));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve({ mbps: null, captive: false });
      });
      req.end();
    });

  const measureUpload = (url, bytes, timeoutMs) =>
    new Promise((resolve) => {
      const payload = Buffer.alloc(bytes, "a");
      const start = process.hrtime.bigint();
      const req = https.request(url, { method: "POST", headers: { "Content-Length": payload.length } }, (res) => {
        const contentType = String(res.headers["content-type"] || "");
        const isCaptive = Boolean(
          (res.statusCode && res.statusCode >= 300 && res.statusCode < 400) ||
          contentType.toLowerCase().includes("text/html")
        );
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          resolve({ mbps: null, captive: isCaptive, statusOk: false });
          return;
        }
        res.on("data", () => {});
        res.on("end", () => {
          const end = process.hrtime.bigint();
          const seconds = Number(end - start) / 1e9;
          if (!Number.isFinite(seconds) || seconds <= 0) {
            resolve({ mbps: null, captive: isCaptive, statusOk: false });
            return;
          }
          const mbps = (payload.length * 8) / seconds / 1e6;
          resolve({ mbps: Number.isFinite(mbps) ? mbps : null, captive: isCaptive, statusOk: true });
        });
      });
      req.on("error", () => resolve({ mbps: null, captive: false, statusOk: false }));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        resolve({ mbps: null, captive: false, statusOk: false });
      });
      req.end(payload);
    });

  const measureUploadWithFallback = async (urls, bytes, timeoutMs) => {
    const list = Array.isArray(urls) && urls.length ? urls : [];
    let lastResult = { mbps: null, captive: false, statusOk: false };
    for (const url of list) {
      // Try each upload endpoint until one succeeds.
      // Keep the last failure for diagnostics.
      // eslint-disable-next-line no-await-in-loop
      const result = await measureUpload(url, bytes, timeoutMs);
      lastResult = result;
      if (Number.isFinite(result.mbps) && result.statusOk) {
        return result;
      }
    }
    return lastResult;
  };

  const runHost = async (host) => {
    const ping = await measurePing(host.pingUrl, 5000);
    const download = await measureDownload(host.downloadUrl, 5 * 1024 * 1024, 15000);
    const upload = await measureUploadWithFallback(host.uploadUrls, 2 * 1024 * 1024, 15000);
    const downloadOk = Number.isFinite(download.mbps);
    const uploadOk = Number.isFinite(upload.mbps) && upload.statusOk;
    return {
      name: host.name,
      pingMs: ping.ms,
      downloadMbps: download.mbps,
      uploadMbps: upload.mbps,
      downloadOk,
      uploadOk,
      captive: Boolean(download.captive || upload.captive)
    };
  };

  return (async () => {
    const hosts = [
      {
        name: "fastly",
        pingUrl: "https://speed.fastly.com/",
        downloadUrl: "https://speed.fastly.com/100MB.bin",
        uploadUrls: [
          "https://speed.fastly.com/upload",
          "https://speed.fastly.com/upload.php"
        ]
      },
      {
        name: "akamai",
        pingUrl: "https://www.akamai.com/",
        downloadUrl: "https://speedtest.akamai.com/100MB.bin",
        uploadUrls: ["https://speedtest.akamai.com/upload.php"]
      }
    ];

    const results = await Promise.all(hosts.map((host) => runHost(host)));
    return summarizeSpeedtestResults(hosts, results);
  })();
}

ipcMain.handle("run-diagnostics", async (_event, options) => {
  const result = await collectDiagnostics(options);
  return result;
});

ipcMain.handle("run-setup", async (_event, action) => {
  if (app.isPackaged) {
    return { ok: false, output: "Setup commands are only available in the source (dev) build." };
  }
  if (process.platform !== "win32") {
    return { ok: false, output: "Setup commands are only available on Windows." };
  }
  if (action === "install") {
    return runCommand("npm.cmd", ["install"]);
  }
  if (action === "start") {
    return runCommand("npm.cmd", ["start"]);
  }
  return { ok: false, output: "Unknown setup action." };
});

ipcMain.handle("export-results", async (event, payload) => {
  const { format, contentText, contentHtml, contentJson, contentCsv } = payload;
  const stamp = timestampStamp();
  const extension = format === "pdf"
    ? "pdf"
    : format === "json"
      ? "json"
      : format === "csv"
        ? "csv"
        : "txt";
  const defaultName = `results_diagnostic_${stamp}.${extension}`;
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save Diagnostics",
    defaultPath: path.join(app.getPath("downloads"), defaultName),
    filters: format === "pdf"
      ? [{ name: "PDF", extensions: ["pdf"] }]
      : format === "json"
        ? [{ name: "JSON", extensions: ["json"] }]
        : format === "csv"
          ? [{ name: "CSV", extensions: ["csv"] }]
          : [{ name: "Text", extensions: ["txt"] }]
  });

  if (canceled || !filePath) return { saved: false };
  if (isNetworkPath(filePath)) {
    return { saved: false, error: "Network paths are not allowed for exports." };
  }

  if (format === "txt") {
    const normalizedText = String(contentText || "").replace(/\r?\n/g, os.EOL);
    await require("fs").promises.writeFile(filePath, normalizedText, "utf8");
    return { saved: true, path: filePath };
  }
  if (format === "json") {
    await require("fs").promises.writeFile(filePath, String(contentJson || ""), "utf8");
    return { saved: true, path: filePath };
  }
  if (format === "csv") {
    await require("fs").promises.writeFile(filePath, String(contentCsv || ""), "utf8");
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

ipcMain.handle("save-baseline", async (_event, payload) => {
  const { current } = payload || {};
  if (!current) return { saved: false };
  const stamp = timestampStamp();
  const defaultName = `baseline_${stamp}.json`;
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save Baseline",
    defaultPath: path.join(app.getPath("documents"), defaultName),
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (canceled || !filePath) return { saved: false };
  if (isNetworkPath(filePath)) {
    return { saved: false, error: "Network paths are not allowed for baselines." };
  }
  const data = {
    baselineMeta: {
      createdAt: new Date().toISOString(),
      app: app.getName(),
      version: app.getVersion()
    },
    diagnostics: current
  };
  await require("fs").promises.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  return { saved: true, path: filePath };
});

ipcMain.handle("compare-baseline", async (_event, payload) => {
  const { current } = payload || {};
  if (!current) return { ok: false, error: "No diagnostics to compare." };
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Select baseline file",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (canceled || !filePaths?.length) return { ok: false, canceled: true };
  const baselinePath = filePaths[0];
  let baselineData;
  try {
    const raw = await require("fs").promises.readFile(baselinePath, "utf8");
    baselineData = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: err.message || "Failed to read baseline file." };
  }
  const baselineDiagnostics = baselineData?.diagnostics || baselineData;
  const diff = compareSnapshots(baselineDiagnostics, current);
  return {
    ok: true,
    path: baselinePath,
    baselineMeta: baselineData?.baselineMeta || null,
    diff
  };
});

const isCli = process.argv.includes("--cli");

app.whenReady().then(async () => {
  if (!isCli) {
    createWindow();
    return;
  }
  const getArgValue = (flag) => {
    const hit = process.argv.find((arg) => arg.startsWith(`${flag}=`));
    return hit ? hit.slice(flag.length + 1) : null;
  };
  const hasFlag = (flag) => process.argv.includes(flag);
  const approach = getArgValue("--approach") || "brief";
  const mode = approach === "brief" ? "quick" : "full";
  const includeSoftware = !hasFlag("--no-software");
  const includeDependencies = !hasFlag("--no-dependencies");
  const includeOptimization = !hasFlag("--no-optimization");
  const format = (getArgValue("--format") || "json").toLowerCase();
  const outputPath = getArgValue("--output");
  const baselinePath = getArgValue("--baseline");

  let diagnostics;
  try {
    diagnostics = await collectDiagnostics({
      approach,
      mode,
      includeSoftware,
      includeDependencies,
      includeOptimization
    });
  } catch (err) {
    console.error(err);
    app.exit(1);
    return;
  }

  const suggestions = includeOptimization
    ? getSuggestionsPlain(diagnostics, approach)
    : ["Optimization disabled by --no-optimization"];
  const summary = {
    healthScore: computeHealthScore(diagnostics, approach),
    topPriorities: includeOptimization ? suggestions.slice(0, 3) : ["Optimization disabled"]
  };
  const payload = {
    generatedAt: new Date().toISOString(),
    approach,
    summary,
    suggestions,
    diagnostics
  };
  if (baselinePath) {
    try {
      const raw = await require("fs").promises.readFile(baselinePath, "utf8");
      const baselineData = JSON.parse(raw);
      const baselineDiagnostics = baselineData?.diagnostics || baselineData;
      payload.baselineDiff = compareSnapshots(baselineDiagnostics, diagnostics);
    } catch (err) {
      payload.baselineError = err.message || "Failed to read baseline file.";
    }
  }

  const output = format === "csv"
    ? formatCsvExport(payload, os.EOL)
    : JSON.stringify(payload, null, 2);

  try {
    if (outputPath) {
      if (isNetworkPath(outputPath)) {
        throw new Error("Network paths are not allowed for exports.");
      }
      await require("fs").promises.writeFile(outputPath, output, "utf8");
    } else {
      console.log(output);
    }
  } catch (err) {
    console.error(err);
    app.exit(1);
    return;
  }
  app.exit(0);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});



