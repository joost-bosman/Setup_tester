const { app, BrowserWindow, dialog, ipcMain, screen } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");

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
  const normalize = (value) => {
    if (value === null || value === undefined || value === "") return "n/a";
    if (Number.isFinite(value)) return value;
    return String(value);
  };
  const changes = [];
  baseFlat.forEach((entry) => {
    const nextVal = lookup.get(entry.path);
    const before = normalize(entry.value);
    const after = normalize(nextVal);
    if (before !== after) {
      changes.push({ path: entry.path, before, after });
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
  const res = await runCommand("netsh", ["wlan", "show", "interfaces"]);
  if (!res.ok) return null;
  const parsed = parseKeyValueLines(res.output);
  if (!parsed) return null;
  return {
    ssid: parsed.ssid || null,
    state: parsed.state || null,
    signal: parsed.signal || null,
    radio: parsed["radio type"] || null
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
    driverVersion: windowsGpu?.driverVersion || null,
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
      testUrl: "https://www.speedtest.net/",
      ok: speedtest.ok,
      downloadMbps: speedtest.downloadMbps || null,
      uploadMbps: speedtest.uploadMbps || null,
      pingMs: speedtest.pingMs || null,
      error: speedtest.error || null
    };
  } else {
    diag.internet = {
      testUrl: "https://www.speedtest.net/",
      ok: null,
      downloadMbps: null,
      uploadMbps: null,
      pingMs: null,
      error: "Skipped in brief mode"
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
    defaultPath: path.join(app.getPath("documents"), defaultName),
    filters: format === "pdf"
      ? [{ name: "PDF", extensions: ["pdf"] }]
      : format === "json"
        ? [{ name: "JSON", extensions: ["json"] }]
        : format === "csv"
          ? [{ name: "CSV", extensions: ["csv"] }]
          : [{ name: "Text", extensions: ["txt"] }]
  });

  if (canceled || !filePath) return { saved: false };

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

  const payload = { diagnostics };
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

  const toCsv = (obj) => {
    const rows = [["path", "value"]];
    const flatten = (value, prefix = "") => {
      if (Array.isArray(value)) {
        rows.push([prefix, value.join("; ")]);
        return;
      }
      if (value && typeof value === "object") {
        Object.keys(value).forEach((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key));
        return;
      }
      rows.push([prefix, value ?? ""]);
    };
    flatten(obj);
    return rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join(os.EOL);
  };

  const output = format === "csv"
    ? toCsv(payload)
    : JSON.stringify(payload, null, 2);

  try {
    if (outputPath) {
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



