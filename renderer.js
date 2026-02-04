const runBtn = document.getElementById("runBtn");
const exportBtn = document.getElementById("exportBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const timestampEl = document.getElementById("timestamp");
const suggestionsList = document.getElementById("suggestionsList");
const modal = document.getElementById("modal");
const exportTxt = document.getElementById("exportTxt");
const exportPdf = document.getElementById("exportPdf");
const cancelExport = document.getElementById("cancelExport");
const setupCard = document.getElementById("setupCard");
const setupInstall = document.getElementById("setupInstall");
const setupStart = document.getElementById("setupStart");
const setupStatus = document.getElementById("setupStatus");
const platformBadge = document.getElementById("platformBadge");
const screenStart = document.getElementById("screenStart");
const screenProgress = document.getElementById("screenProgress");
const screenResults = document.getElementById("screenResults");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const resultsBtn = document.getElementById("resultsBtn");
const resultsStatus = document.getElementById("resultsStatus");

let lastResults = null;

const appIcon = document.querySelector(".app-icon");
if (appIcon && window.diagnostics && window.diagnostics.platform) {
  const iconFile = window.diagnostics.platform === "darwin" ? "icon-mac.png" : "icon-win.png";
  appIcon.src = `assets/${iconFile}`;
}

if (platformBadge && window.diagnostics?.platform) {
  platformBadge.textContent = window.diagnostics.platform === "darwin" ? "macOS" : "Windows";
}

if (window.diagnostics?.platform !== "win32" && setupCard) {
  setupCard.style.display = "none";
}


function getSelectedValue(name) {
  const input = document.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : null;
}

function showScreen(screen) {
  [screenStart, screenProgress, screenResults].forEach((node) => {
    if (!node) return;
    node.classList.toggle("hidden", node !== screen);
  });
}

function formatForDisplay(obj) {
  if (!obj) return "No diagnostics available.";
  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "n/a";
    if (Array.isArray(value)) return value.length ? value.join(", ") : "n/a";
    return String(value);
  };
  const toMBps = (mbps) => {
    const num = Number(mbps);
    if (!Number.isFinite(num)) return "n/a";
    return (num / 8).toFixed(2);
  };

  const ideCaps = Array.isArray(obj?.memory?.alternativeIdeCaps)
    ? obj.memory.alternativeIdeCaps.map((entry) => `${entry.product}: ${entry.xmxMb} MB`)
    : [];
  const cliTools = obj?.cli || null;
  const cliEntries = cliTools ? Object.entries(cliTools) : [];
  const cliLines = cliEntries
    .filter(([, info]) => info?.ok)
    .map(([name, info]) => {
      const version = info?.version ? ` (${info.version})` : "";
      return `- ${name}: ok${version}`;
    });

  const lines = [
    "OS",
    `- version: ${formatValue(obj?.os?.version)}`,
    `- release: ${formatValue(obj?.os?.release)}`,
    `- arch: ${formatValue(obj?.os?.arch)}`,
    `- hostname: ${formatValue(obj?.os?.hostname)}`,
    `- ip: ${formatValue(obj?.os?.ip)}`,
    "",
    "CPU (Processor)",
    `- vendor: ${formatValue(obj?.cpu?.vendor)}`,
    `- model: ${formatValue(obj?.cpu?.model)}`,
    `- cores: ${formatValue(obj?.cpu?.cores)}`,
    `- total speed: ${formatValue(obj?.cpu?.totalSpeedMHz)} MHz (${formatValue(obj?.cpu?.totalSpeedGHz)} GHz)`,
    `- voltage: ${formatValue(obj?.cpu?.voltage)}`,
    "",
    "RAM Modules",
    `- vendor: ${formatValue(obj?.memory?.moduleVendors)}`,
    `- total: ${formatValue(obj?.memory?.total)}`,
    `- used: ${formatValue(obj?.memory?.used)}`,
    `- free: ${formatValue(obj?.memory?.free)}`,
    `- IntelliJ cap: ${formatValue(obj?.memory?.intellijCapMb)} MB`,
    `- Alt IDE caps: ${ideCaps.length ? ideCaps.join("; ") : "n/a"}`,
    "",
    "GPU (Videocard)",
    `- vendor: ${formatValue(obj?.gpu?.vendor)}`,
    `- chip: ${formatValue(obj?.gpu?.chip)}`,
    `- cores: ${formatValue(obj?.gpu?.cores)}`,
    `- speed: ${formatValue(obj?.gpu?.speedMHz)} MHz (${formatValue(obj?.gpu?.speedGHz)} GHz)`,
    `- voltage: ${formatValue(obj?.gpu?.voltage)}`,
    "",
    "Internet",
    `- test: ${formatValue(obj?.internet?.testUrl)}`,
    `- download: ${toMBps(obj?.internet?.downloadMbps)} MB/s`,
    `- upload: ${toMBps(obj?.internet?.uploadMbps)} MB/s`,
    `- ping: ${formatValue(obj?.internet?.pingMs)} ms`,
    `- status: ${formatValue(obj?.internet?.ok ? "ok" : obj?.internet?.error || "n/a")}`,
    ...(cliLines.length ? ["", "CLI Tools", ...cliLines] : [])
  ];

  return lines.join("\n");
}

function getSuggestions(diag) {
  const suggestions = [];
  if (!diag) return suggestions;

  const totalMem = Number(diag?.memory?.total?.replace(/[^\d.]/g, ""));
  const freeMem = Number(diag?.memory?.free?.replace(/[^\d.]/g, ""));
  if (Number.isFinite(totalMem) && Number.isFinite(freeMem) && totalMem > 0) {
    const freeRatio = freeMem / totalMem;
    if (freeRatio < 0.2) {
      suggestions.push("Low free memory: close unused apps or restart to free RAM.");
    }
  }

  const loadAvg = diag?.cpu?.loadAvg;
  const cores = Number(diag?.cpu?.cores);
  if (Array.isArray(loadAvg) && loadAvg.length > 0 && Number.isFinite(cores)) {
    if (loadAvg[0] > cores) {
      suggestions.push("High CPU load: check Task Manager for heavy processes.");
    }
  }

  const latency = Number(diag?.internet?.latencyMs);
  if (diag?.internet?.ok === false) {
    suggestions.push("Internet check failed: verify your connection or firewall.");
  } else if (Number.isFinite(latency) && latency > 200) {
    suggestions.push("High internet latency: try switching networks or restarting the router.");
  }

  if (diag?.os?.updateStatus === "updates_available") {
    suggestions.push("macOS updates available: install the latest updates.");
  }

  if (!diag?.gpu) {
    suggestions.push("Run full diagnostics to include GPU and process details.");
  }

  const missingTools = Object.entries(diag?.cli || {})
    .filter(([, info]) => info?.ok === false)
    .map(([name]) => name);
  if (missingTools.length) {
    suggestions.push(`Missing CLI tools: ${missingTools.join(", ")}.`);
  }

  if (Number.isFinite(diag?.memory?.intellijCapMb) || (diag?.memory?.alternativeIdeCaps || []).length > 0) {
    suggestions.push("JetBrains IDE cap detected: increase IDE heap size if performance is slow.");
  }

  if (suggestions.length === 0) {
    suggestions.push("No immediate issues found. System looks healthy.");
  }

  return suggestions;
}

function formatForText(obj) {
  const suggestions = getSuggestions(obj);
  return [
    formatForDisplay(obj),
    "",
    "Suggestions:",
    ...suggestions.map((item) => `- ${item}`)
  ].join("\n");
}

function formatForPdf(obj) {
  const suggestions = getSuggestions(obj);
  return [
    formatForDisplay(obj),
    "",
    "Suggestions:",
    ...suggestions.map((item) => `- ${item}`)
  ].join("\n");
}

async function runDiagnostics() {
  statusEl.textContent = "Running diagnostics...";
  exportBtn.disabled = true;
  if (resultsStatus) resultsStatus.textContent = "Running...";
  showScreen(screenProgress);
  if (progressText) progressText.textContent = "Running checks...";
  if (progressFill) progressFill.style.width = "30%";
  const privacy = getSelectedValue("privacy");
  const mode = getSelectedValue("mode");

  try {
    const data = await window.diagnostics.run({ privacy, mode });
    lastResults = data;
    resultsEl.textContent = formatForDisplay(data);
    const suggestions = getSuggestions(data);
    suggestionsList.innerHTML = suggestions.map((item) => `<li>${item}</li>`).join("");
    timestampEl.textContent = new Date().toLocaleString();
    statusEl.textContent = "Diagnostics complete.";
    if (resultsStatus) resultsStatus.textContent = "Complete.";
    exportBtn.disabled = false;
    if (progressText) progressText.textContent = "Wrapping up...";
    if (progressFill) progressFill.style.width = "100%";
    showScreen(screenResults);
  } catch (err) {
    statusEl.textContent = "Diagnostics failed.";
    if (resultsStatus) resultsStatus.textContent = "Failed.";
    resultsEl.textContent = `Error: ${err.message || err}`;
    showScreen(screenResults);
  }
}

function openModal() {
  if (!lastResults) return;
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

async function exportResults(format) {
  if (!lastResults) return;
  statusEl.textContent = `Saving ${format.toUpperCase()}...`;
  const contentText = formatForText(lastResults);
  const contentHtml = formatForPdf(lastResults)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  try {
    const res = await window.diagnostics.exportResults({
      format,
      contentText,
      contentHtml
    });
    statusEl.textContent = res.saved ? "Export complete." : "Export canceled.";
  } catch (err) {
    statusEl.textContent = "Export failed.";
  }
}

runBtn.addEventListener("click", runDiagnostics);
exportBtn.addEventListener("click", openModal);
cancelExport.addEventListener("click", closeModal);
exportTxt.addEventListener("click", async () => {
  closeModal();
  await exportResults("txt");
});
exportPdf.addEventListener("click", async () => {
  closeModal();
  await exportResults("pdf");
});
if (resultsBtn) {
  resultsBtn.addEventListener("click", () => {
    if (!lastResults) return;
    showScreen(screenResults);
  });
}

async function runSetup(action) {
  if (!window.diagnostics?.runSetup) return;
  setupStatus.textContent = action === "install" ? "Installing..." : "Starting...";
  try {
    const res = await window.diagnostics.runSetup(action);
    setupStatus.textContent = res.ok ? "Done." : "Failed.";
    if (res.output) {
      resultsEl.textContent = res.output;
    }
  } catch (err) {
    setupStatus.textContent = "Failed.";
    resultsEl.textContent = `Error: ${err.message || err}`;
  }
}

if (setupInstall) {
  setupInstall.addEventListener("click", () => runSetup("install"));
}

if (setupStart) {
  setupStart.addEventListener("click", () => runSetup("start"));
}

