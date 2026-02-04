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

let lastResults = null;

const appIcon = document.querySelector(".app-icon");
if (appIcon && window.diagnostics && window.diagnostics.platform) {
  const iconFile = window.diagnostics.platform === "darwin" ? "icon-mac.png" : "icon-win.png";
  appIcon.src = `assets/${iconFile}`;
}


function getSelectedValue(name) {
  const input = document.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : null;
}

function formatForDisplay(obj) {
  return JSON.stringify(obj, null, 2);
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

  if (suggestions.length === 0) {
    suggestions.push("No immediate issues found. System looks healthy.");
  }

  return suggestions;
}

function getIntelliJTips() {
  return [
    "Increase IDE heap size (Help > Change Memory Settings).",
    "Disable unused plugins to reduce background work.",
    "Exclude large build/output folders from indexing.",
    "Enable Git file system monitor for faster status updates.",
    "Use Gradle/Maven daemon and parallel build options.",
    "Invalidate caches only when necessary (avoid frequent reindexing)."
  ];
}

function buildMacSummary(diag) {
  if (diag?.os?.platform !== "darwin") return [];
  const update =
    diag?.os?.updateStatus === "updates_available"
      ? "updates available"
      : diag?.os?.updateStatus === "up_to_date"
        ? "up to date"
        : "unknown";

  const gpuName = diag?.gpu?.name || "n/a";
  const gpuVendor = diag?.gpu?.vendorLink ? ` (${diag.gpu.vendorLink})` : "";

  return [
    `macOS update: ${update}`,
    `OS version: ${diag?.os?.version || "n/a"} (${diag?.os?.release || "n/a"})`,
    `CPU: ${diag?.cpu?.model || "n/a"}`,
    `Memory: ${diag?.memory?.total || "n/a"}`,
    `GPU: ${gpuName}${gpuVendor}`,
    `App: ${diag?.app?.name || "n/a"} ${diag?.app?.version || ""}`.trim(),
    `Electron: ${diag?.app?.electron || "n/a"} | Node: ${diag?.app?.node || "n/a"}`,
    `Java home: ${diag?.app?.javaHome || "not set"}`
  ];
}

function formatForText(obj) {
  const suggestions = getSuggestions(obj);
  const macSummary = buildMacSummary(obj);
  return [
    JSON.stringify(obj, null, 2),
    ...(macSummary.length ? ["", "macOS summary:", ...macSummary.map((item) => `- ${item}`)] : []),
    "",
    "Suggestions:",
    ...suggestions.map((item) => `- ${item}`),
    "",
    "IntelliJ tips:",
    ...getIntelliJTips().map((item) => `- ${item}`)
  ].join("\n");
}

function formatForPdf(obj) {
  const suggestions = getSuggestions(obj);
  const macSummary = buildMacSummary(obj);
  return [
    JSON.stringify(obj, null, 2),
    ...(macSummary.length ? ["", "macOS summary:", ...macSummary.map((item) => `- ${item}`)] : []),
    "",
    "Suggestions:",
    ...suggestions.map((item) => `- ${item}`),
    "",
    "IntelliJ tips:",
    ...getIntelliJTips().map((item) => `- ${item}`)
  ].join("\n");
}

async function runDiagnostics() {
  statusEl.textContent = "Running diagnostics...";
  exportBtn.disabled = true;
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
    exportBtn.disabled = false;
  } catch (err) {
    statusEl.textContent = "Diagnostics failed.";
    resultsEl.textContent = `Error: ${err.message || err}`;
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

