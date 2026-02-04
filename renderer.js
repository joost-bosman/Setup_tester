const runBtn = document.getElementById("runBtn");
const exportBtn = document.getElementById("exportBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const timestampEl = document.getElementById("timestamp");
const modal = document.getElementById("modal");
const exportTxt = document.getElementById("exportTxt");
const exportPdf = document.getElementById("exportPdf");
const cancelExport = document.getElementById("cancelExport");

let lastResults = null;

function getSelectedValue(name) {
  const input = document.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : null;
}

function formatForDisplay(obj) {
  return JSON.stringify(obj, null, 2);
}

function formatForText(obj) {
  return JSON.stringify(obj, null, 2);
}

function formatForPdf(obj) {
  return JSON.stringify(obj, null, 2);
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
