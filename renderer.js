const runBtn = document.getElementById("runBtn");
const exportBtn = document.getElementById("exportBtn");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const timestampEl = document.getElementById("timestamp");
const suggestionsList = document.getElementById("suggestionsList");
const modal = document.getElementById("modal");
const exportTxt = document.getElementById("exportTxt");
const exportPdf = document.getElementById("exportPdf");
const exportJson = document.getElementById("exportJson");
const exportCsv = document.getElementById("exportCsv");
const cancelExport = document.getElementById("cancelExport");
const setupCard = document.getElementById("setupCard");
const setupInstall = document.getElementById("setupInstall");
const setupStart = document.getElementById("setupStart");
const setupStatus = document.getElementById("setupStatus");
const platformBadge = document.getElementById("platformBadge");
const screenLanguage = document.getElementById("screenLanguage");
const screenStart = document.getElementById("screenStart");
const screenProgress = document.getElementById("screenProgress");
const screenResults = document.getElementById("screenResults");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");
  const resultsStatus = document.getElementById("resultsStatus");
  const closeApp = document.getElementById("closeApp");
  const startPreviousBtn = document.getElementById("startPreviousBtn");
  const languageContinue = document.getElementById("languageContinue");
  const detectLanguageBtn = document.getElementById("detectLanguageBtn");
  const languageStatus = document.getElementById("languageStatus");
const languageSelect = document.getElementById("languageSelect");
const languageApply = document.getElementById("languageApply");
const languageCard = document.querySelector(".language-card");
const languageList = document.getElementById("languageList");
const saveBaselineBtn = document.getElementById("saveBaselineBtn");
const compareBaselineBtn = document.getElementById("compareBaselineBtn");

let lastResults = null;
let lastOptions = null;
let lastBaselineDiff = null;

// Language setup for UI + report text.
const LANG_STORAGE_KEY = "ddk.language";
const DEFAULT_LANG = "en-GB";
const LANGUAGE_LABEL_KEYS = {
  "en-GB": "language.label.enGB",
  "en-US": "language.label.enUS",
  nl: "language.label.nl",
  hi: "language.label.hi",
  ar: "language.label.ar",
  pl: "language.label.pl",
  uk: "language.label.uk",
  fr: "language.label.fr",
  pt: "language.label.pt",
  "pt-BR": "language.label.ptBR",
  es: "language.label.es",
  "es-419": "language.label.esLA",
  "es-AR": "language.label.esAR",
  "es-PE": "language.label.esPE",
  it: "language.label.it",
  id: "language.label.id",
  de: "language.label.de",
  tr: "language.label.tr",
  ja: "language.label.ja",
  ko: "language.label.ko",
  vi: "language.label.vi",
  th: "language.label.th",
  ms: "language.label.ms",
  fil: "language.label.fil",
  he: "language.label.he",
  el: "language.label.el",
  cs: "language.label.cs",
  sk: "language.label.sk",
  hu: "language.label.hu",
  ro: "language.label.ro",
  bg: "language.label.bg",
  sv: "language.label.sv",
  no: "language.label.no",
  da: "language.label.da",
  fi: "language.label.fi",
  bn: "language.label.bn",
  ta: "language.label.ta",
  te: "language.label.te",
  mr: "language.label.mr",
  gu: "language.label.gu",
  pa: "language.label.pa",
  ur: "language.label.ur",
  sw: "language.label.sw",
  am: "language.label.am",
  ha: "language.label.ha",
  yo: "language.label.yo",
  ig: "language.label.ig",
  af: "language.label.af",
  zu: "language.label.zu"
};

const LANGUAGE_CODES = [
  "en-GB",
  "en-US",
  "nl",
  "hi",
  "ar",
  "pl",
  "uk",
  "fr",
  "pt",
  "pt-BR",
  "es",
  "es-419",
  "es-AR",
  "es-PE",
  "it",
  "id",
  "de",
  "tr",
  "ja",
  "ko",
  "vi",
  "th",
  "ms",
  "fil",
  "he",
  "el",
  "cs",
  "sk",
  "hu",
  "ro",
  "bg",
  "sv",
  "no",
  "da",
  "fi",
  "bn",
  "ta",
  "te",
  "mr",
  "gu",
  "pa",
  "ur",
  "sw",
  "am",
  "ha",
  "yo",
  "ig",
  "af",
  "zu"
];

const LANGUAGE_CACHE = new Map();
let currentLang = DEFAULT_LANG;
let currentPack = { dir: "ltr", strings: {} };
let fallbackPack = { dir: "ltr", strings: {} };

async function loadLanguagePack(code) {
  if (LANGUAGE_CACHE.has(code)) return LANGUAGE_CACHE.get(code);
  const safeCode = LANGUAGE_CODES.includes(code) ? code : DEFAULT_LANG;
  try {
    const res = await fetch(`languages/${safeCode}.json`);
    if (!res.ok) throw new Error(`Failed to load ${safeCode}`);
    const pack = await res.json();
    LANGUAGE_CACHE.set(safeCode, pack);
    return pack;
  } catch (err) {
    if (safeCode !== DEFAULT_LANG) {
      return loadLanguagePack(DEFAULT_LANG);
    }
    const fallback = { dir: "ltr", strings: {} };
    LANGUAGE_CACHE.set(safeCode, fallback);
    return fallback;
  }
}

async function ensureLanguage(code) {
  const next = LANGUAGE_CODES.includes(code) ? code : DEFAULT_LANG;
  const [pack, fallback] = await Promise.all([
    loadLanguagePack(next),
    loadLanguagePack(DEFAULT_LANG)
  ]);
  currentLang = next;
  currentPack = pack || fallback;
  fallbackPack = fallback || { dir: "ltr", strings: {} };
  return currentPack;
}

function t(key, vars = {}) {
  const pack = currentPack || fallbackPack;
  const fallback = fallbackPack?.strings || {};
  const template = key.startsWith("language.label.")
    ? fallback[key] || key
    : (pack?.strings && pack.strings[key]) || fallback[key] || key;
  let resolved = template;
  if (shouldFallbackTranslation(resolved)) {
    const repaired = repairMojibake(resolved);
    resolved = shouldFallbackTranslation(repaired) ? (fallback[key] || resolved) : repaired;
  }
  return resolved.replace(/\{(\w+)\}/g, (_, token) => {
    const value = vars[token];
    return value === undefined || value === null ? "" : String(value);
  });
}

function shouldFallbackTranslation(value) {
  if (typeof value !== "string") return false;
  return /Ãƒ|Ã¢|â€|�/.test(value);
}

function repairMojibake(value) {
  if (typeof value !== "string" || !shouldFallbackTranslation(value)) return value;
  let output = value;
  for (let i = 0; i < 2; i += 1) {
    if (!shouldFallbackTranslation(output)) break;
    const bytes = Uint8Array.from(output, (char) => char.charCodeAt(0));
    const decoded = new TextDecoder("utf-8").decode(bytes);
    if (decoded === output) break;
    output = decoded;
  }
  return output;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    el.textContent = t(key);
  });

  if (statusEl) statusEl.textContent = t("status.ready");
  if (progressText) progressText.textContent = t("progress.preparing");
  if (resultsStatus) resultsStatus.textContent = t("results.status.ready");
  if (setupStatus) setupStatus.textContent = t("setup.status.waiting");
  if (languageStatus) languageStatus.textContent = t("language.status.idle");
  if (resultsEl && !lastResults) resultsEl.textContent = t("results.placeholder");
  if (suggestionsList && !lastResults) {
    renderSuggestions([t("suggestions.placeholder")]);
  }

  const platform = window.diagnostics?.platform === "darwin" ? "platform.macos" : "platform.windows";
  if (platformBadge) platformBadge.textContent = t(platform);
  adjustLanguageScale();
}

function adjustLanguageScale() {
  if (!languageCard || screenLanguage?.classList.contains("hidden")) return;
  requestAnimationFrame(() => {
    const rect = languageCard.getBoundingClientRect();
    if (!rect.height) return;
    const available = Math.max(320, window.innerHeight - 120);
    const scale = Math.min(1, available / rect.height);
    languageCard.style.setProperty("--language-scale", scale.toFixed(3));
    if ("zoom" in languageCard.style) {
      languageCard.style.zoom = scale.toFixed(3);
      languageCard.style.transform = "";
    } else {
      languageCard.style.zoom = "";
      languageCard.style.transform = `scale(${scale.toFixed(3)})`;
    }
    languageCard.classList.toggle("scaled", scale < 1);
  });
}

async function setLanguage(code, persist = true) {
  const pack = await ensureLanguage(code);
  const dir = pack?.dir || "ltr";
  document.documentElement.setAttribute("lang", currentLang);
  document.documentElement.setAttribute("dir", dir);
  document.body.classList.toggle("rtl", dir === "rtl");
  if (persist) {
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  }
  if (languageSelect) {
    languageSelect.value = currentLang;
  }
  const input = document.querySelector(`input[name="language"][value="${currentLang}"]`);
  if (input) input.checked = true;
  applyTranslations();
  if (lastResults) {
    resultsEl.textContent = formatForDisplay(lastResults, lastOptions?.approach, {
      includeOptimization: lastOptions?.includeOptimization,
      baselineDiff: lastBaselineDiff
    });
    const suggestions = lastOptions?.includeOptimization
      ? getSuggestions(lastResults, lastOptions?.approach)
      : [t("note.optimization.disabled")];
    renderSuggestions(suggestions);
  }
}

function renderSuggestions(items) {
  if (!suggestionsList) return;
  suggestionsList.textContent = "";
  const list = Array.isArray(items) ? items : [];
  const fragment = document.createDocumentFragment();
  list.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    fragment.appendChild(li);
  });
  suggestionsList.appendChild(fragment);
}

function renderLanguageOptions() {
  if (languageList) {
    languageList.textContent = "";
  }
  if (languageSelect) {
    languageSelect.textContent = "";
  }

  const fragment = document.createDocumentFragment();
  LANGUAGE_CODES.forEach((code) => {
    const labelKey = LANGUAGE_LABEL_KEYS[code];
    const label = document.createElement("label");
    label.className = "radio";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "language";
    input.value = code;
    if (code === DEFAULT_LANG) input.checked = true;

    const span = document.createElement("span");
    if (labelKey) span.setAttribute("data-i18n", labelKey);
    span.textContent = labelKey ? t(labelKey) : code;

    label.appendChild(input);
    label.appendChild(span);
    fragment.appendChild(label);

    if (languageSelect) {
      const option = document.createElement("option");
      option.value = code;
      if (labelKey) option.setAttribute("data-i18n", labelKey);
      option.textContent = labelKey ? t(labelKey) : code;
      languageSelect.appendChild(option);
    }
  });

  if (languageList) {
    languageList.appendChild(fragment);
  }
}

function mapCountryToLanguage(countryCode) {
  if (!countryCode) return null;
  const code = String(countryCode).toUpperCase();
  if (["NL", "BE"].includes(code)) return "nl";
  if (["US"].includes(code)) return "en-US";
  if (["GB", "IE"].includes(code)) return "en-GB";
  if (["IN"].includes(code)) return "hi";
  if (["AE", "SA", "EG", "JO", "MA", "DZ", "TN", "QA", "KW", "BH", "OM"].includes(code)) return "ar";
  if (["IL"].includes(code)) return "he";
  if (["PL"].includes(code)) return "pl";
  if (["UA"].includes(code)) return "uk";
  if (["FR", "CH"].includes(code)) return "fr";
  if (["PT"].includes(code)) return "pt";
  if (["BR"].includes(code)) return "pt-BR";
  if (["ES"].includes(code)) return "es";
  if (["AR"].includes(code)) return "es-AR";
  if (["PE"].includes(code)) return "es-PE";
  if (["MX", "CO", "CL", "VE", "EC", "BO", "PY", "UY", "DO", "GT", "HN", "SV", "NI", "CR", "PA", "PR", "CU"].includes(code)) {
    return "es-419";
  }
  if (["IT"].includes(code)) return "it";
  if (["ID"].includes(code)) return "id";
  if (["DE", "AT"].includes(code)) return "de";
  if (["TR"].includes(code)) return "tr";
  if (["JP"].includes(code)) return "ja";
  if (["KR"].includes(code)) return "ko";
  if (["VN"].includes(code)) return "vi";
  if (["TH"].includes(code)) return "th";
  if (["MY"].includes(code)) return "ms";
  if (["PH"].includes(code)) return "fil";
  if (["SE"].includes(code)) return "sv";
  if (["NO"].includes(code)) return "no";
  if (["DK"].includes(code)) return "da";
  if (["FI"].includes(code)) return "fi";
  if (["BD"].includes(code)) return "bn";
  if (["LK"].includes(code)) return "ta";
  if (["SG"].includes(code)) return "te";
  if (["ZA"].includes(code)) return "af";
  if (["SZ", "LS"].includes(code)) return "zu";
  if (["KE", "TZ", "UG", "RW", "BI"].includes(code)) return "sw";
  if (["NG"].includes(code)) return "yo";
  if (["NE"].includes(code)) return "ha";
  if (["CM"].includes(code)) return "ig";
  return null;
}

async function detectLanguage() {
  if (!languageStatus) return;
  languageStatus.textContent = t("language.status.detecting");
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("geo lookup failed");
    const data = await res.json();
    const lang = mapCountryToLanguage(data?.country_code);
    if (!lang) {
      languageStatus.textContent = t("language.status.failed");
      return;
    }
    await setLanguage(lang, true);
    const input = document.querySelector(`input[name="language"][value="${lang}"]`);
    if (input) input.checked = true;
    const labelKey = LANGUAGE_LABEL_KEYS[lang];
    languageStatus.textContent = t("language.status.detected", {
      language: labelKey ? t(labelKey) : lang
    });
  } catch {
    languageStatus.textContent = t("language.status.failed");
  }
}

async function initLanguage() {
  await ensureLanguage(DEFAULT_LANG);
  renderLanguageOptions();
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored) {
    await setLanguage(stored, false);
    showScreen(screenStart);
    return;
  }
  await setLanguage(DEFAULT_LANG, false);
  showScreen(screenLanguage);
  detectLanguage();
}

const appIcon = document.querySelector(".app-icon");
if (appIcon && window.diagnostics && window.diagnostics.platform) {
  const iconFile = window.diagnostics.platform === "darwin" ? "icon-mac.png" : "icon-win.png";
  appIcon.src = `assets/${iconFile}`;
}

if (window.diagnostics?.platform !== "win32" && setupCard) {
  setupCard.style.display = "none";
}


function getSelectedValue(name) {
  const input = document.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : null;
}

function getSelectedCheckbox(name, fallback = true) {
  const input = document.querySelector(`input[name="${name}"]`);
  return input ? input.checked : fallback;
}

  function showScreen(screen) {
    [screenLanguage, screenStart, screenProgress, screenResults].forEach((node) => {
      if (!node) return;
      node.classList.toggle("hidden", node !== screen);
    });
    if (screen === screenLanguage) adjustLanguageScale();
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

  function getTopPriorities(diag, approach, includeOptimization) {
    if (!includeOptimization) return [t("note.optimization.disabled")];
    return getSuggestions(diag, approach).slice(0, 3);
  }

  function formatBaselineDiff(diff) {
    if (!Array.isArray(diff) || diff.length === 0) {
      return [t("section.baseline"), `- ${t("label.baseline.noChanges")}`];
    }
    return [
      t("section.baseline"),
      ...diff.map((item) => `- ${item.path}: ${item.before} -> ${item.after}`)
    ];
  }

  function formatCsvExport(payload) {
    const externalFormatter = window.CsvUtils?.formatCsvExport;
    if (typeof externalFormatter === "function") {
      return externalFormatter(payload);
    }
    const rows = [["path", "value"]];
    const flatten = (value, prefix = "") => {
      if (Array.isArray(value)) {
        if (!value.length) {
          rows.push([prefix, ""]);
          return;
        }
        value.forEach((item, index) => {
          const nextPrefix = prefix ? `${prefix}[${index}]` : String(index);
          flatten(item, nextPrefix);
        });
        return;
      }
      if (value && typeof value === "object") {
        Object.keys(value).forEach((key) => flatten(value[key], prefix ? `${prefix}.${key}` : key));
        return;
      }
      rows.push([prefix, value ?? ""]);
    };
    flatten(payload);
    return rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  }

  function buildExportPayload(diag, approach, includeOptimization, baselineDiff) {
    const suggestions = includeOptimization
      ? getSuggestions(diag, approach)
      : [t("note.optimization.disabled")];
    return {
      generatedAt: new Date().toISOString(),
      approach,
      summary: {
        healthScore: computeHealthScore(diag, approach),
        topPriorities: getTopPriorities(diag, approach, includeOptimization)
      },
      suggestions,
      baselineDiff: baselineDiff || [],
      diagnostics: diag
    };
  }

  function getInternetNoteText(internet) {
    if (!internet) return "";
    if (internet.noteCode) return t(internet.noteCode);
    if (internet.note) return String(internet.note);
    return "";
  }

  function getInternetErrorText(internet) {
    if (!internet) return "";
    if (internet.errorCode) return t(internet.errorCode);
    if (internet.error) return String(internet.error);
    return "";
  }

  function formatInternetStatus(internet) {
    if (!internet) return t("note.na");
    const note = getInternetNoteText(internet);
    const status = internet.ok ? t("label.ok") : (getInternetErrorText(internet) || t("note.na"));
    return note ? `${status} (${note})` : status;
  }

  // Convert raw diagnostics into readable text.
function formatForDisplay(obj, approach = "extensive", options = {}) {
  if (!obj) return t("note.noDiagnostics");
  const isBrief = approach === "brief";
  const includeOptimization = options.includeOptimization !== false;
  const baselineDiff = options.baselineDiff || null;
  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return t("note.na");
    if (Array.isArray(value)) return value.length ? value.join(", ") : t("note.na");
    return String(value);
  };
  const toMBps = (mbps) => {
    const num = Number(mbps);
    if (!Number.isFinite(num)) return t("note.na");
    return (num / 8).toFixed(2);
  };
  const formatWifiStatus = (wifi) => {
    if (!wifi) return t("note.na");
    if (wifi.errorCode) return t(wifi.errorCode);
    const ssid = formatValue(wifi.ssid) || t("note.na");
    if (!wifi.signal) return ssid;
    return `${ssid} (${t("label.signal") || "signal"} ${formatValue(wifi.signal)})`;
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
      return `- ${name}: ${t("label.ok")}${version}`;
    });
  const cliMissing = cliEntries.filter(([, info]) => info?.ok === false).map(([name]) => name);

  const softwareList = Array.isArray(obj?.software) ? obj.software : [];
  const softwarePresentItems = softwareList.filter((item) => item.present);
  const softwareLines = softwarePresentItems.map((item) => `- ${item.name}: ${t("label.ok")}`);
  const softwarePresent = softwarePresentItems.length;

  const dependencyList = Array.isArray(obj?.dependencies) ? obj.dependencies : [];
  const dependencyPresentItems = dependencyList.filter((item) => item.present);
  const dependencyMissing = dependencyList.filter((item) => !item.present).map((item) => item.name);
  const dependencyLines = dependencyPresentItems.map((item) => {
    const version = item.version ? ` (${item.version})` : "";
    return `- ${item.name}: ${t("label.ok")}${version}`;
  });
  const dependencyPresent = dependencyPresentItems.length;

  const healthScore = computeHealthScore(obj, approach);
  const topPriorities = getTopPriorities(obj, approach, includeOptimization);
  const summaryLines = [
    t("section.summary"),
    `- ${t("label.healthScore")}: ${healthScore}/100`,
    `- ${t("label.topPriorities")}: ${topPriorities.length ? topPriorities.join("; ") : t("note.na")}`
  ];

  if (isBrief) {
    const cliOk = cliEntries.filter(([, info]) => info?.ok).length;
    const missingEssentials = [].concat(cliMissing, dependencyMissing);
    const internetNote = getInternetNoteText(obj?.internet);
    const internetSummary = obj?.internet?.errorCode === "note.skipped" || obj?.internet?.error === "Skipped in brief mode"
      ? t("note.skipped")
      : obj?.internet?.ok === false
        ? formatInternetStatus(obj?.internet)
        : `${toMBps(obj?.internet?.downloadMbps)} MB/s down, ${toMBps(obj?.internet?.uploadMbps)} MB/s up, ${formatValue(obj?.internet?.pingMs)} ms ping${internetNote ? ` (${internetNote})` : ""}`;
    const briefLines = [
      t("results.brief.title"),
      "",
      ...summaryLines,
      ...(baselineDiff ? ["", ...formatBaselineDiff(baselineDiff)] : []),
      "",
      `- ${t("brief.os")}: ${formatValue(obj?.os?.version)} (${formatValue(obj?.os?.release)})`,
      `- ${t("brief.arch")}: ${formatValue(obj?.os?.arch)}`,
      `- ${t("brief.cpu")}: ${formatValue(obj?.cpu?.model)} (${formatValue(obj?.cpu?.cores)} ${t("label.cores")})`,
      `- ${t("brief.ram")}: ${formatValue(obj?.memory?.total)} ${t("label.total")}, ${formatValue(obj?.memory?.free)} ${t("label.free")}`,
      `- ${t("brief.gpu")}: ${formatValue(obj?.gpu?.vendor)} ${formatValue(obj?.gpu?.chip)}`,
      `- ${t("brief.internet")}: ${internetSummary}`,
      cliOk ? `- ${t("brief.cli")}: ${cliOk}` : `- ${t("brief.cli")}: ${t("note.na")}`,
      softwarePresent ? `- ${t("brief.software")}: ${softwarePresent}` : `- ${t("brief.software")}: ${t("note.na")}`,
      dependencyPresent ? `- ${t("brief.dependencies")}: ${dependencyPresent}` : `- ${t("brief.dependencies")}: ${t("note.na")}`,
      missingEssentials.length
        ? `- ${t("brief.missing")}: ${missingEssentials.join(", ")}`
        : `- ${t("brief.missing")}: ${t("note.missing.none")}`
    ];
    return briefLines.join("\n");
  }

  const lines = [
    t("results.extensive.title"),
    "",
    ...summaryLines,
    ...(baselineDiff ? ["", ...formatBaselineDiff(baselineDiff)] : []),
    "",
    t("section.os"),
    `- ${t("label.version")}: ${formatValue(obj?.os?.version)}`,
    `- ${t("label.release")}: ${formatValue(obj?.os?.release)}`,
    `- ${t("label.arch")}: ${formatValue(obj?.os?.arch)}`,
    `- ${t("label.hostname")}: ${formatValue(obj?.os?.hostname)}`,
    `- ${t("label.ip")}: ${formatValue(obj?.os?.ip)}`,
    `- ${t("label.updateStatus")}: ${formatValue(obj?.os?.updateStatus)}`,
    "",
    t("section.cpu"),
    `- ${t("label.vendor")}: ${formatValue(obj?.cpu?.vendor)}`,
    `- ${t("label.model")}: ${formatValue(obj?.cpu?.model)}`,
    `- ${t("label.cores")}: ${formatValue(obj?.cpu?.cores)}`,
    `- ${t("label.cpuPackages")}: ${formatValue(obj?.cpu?.packageCount)}`,
    `- ${t("label.totalSpeed")}: ${formatValue(obj?.cpu?.totalSpeedMHz)} MHz (${formatValue(obj?.cpu?.totalSpeedGHz)} GHz)`,
    `- ${t("label.voltage")}: ${formatValue(obj?.cpu?.voltage)}`,
    `- ${t("label.loadAvg")}: ${formatValue(obj?.cpu?.loadAvg)}`,
    "",
    t("section.ram"),
    `- ${t("label.vendor")}: ${formatValue(obj?.memory?.moduleVendors)}`,
    `- ${t("label.total")}: ${formatValue(obj?.memory?.total)}`,
    `- ${t("label.used")}: ${formatValue(obj?.memory?.used)}`,
    `- ${t("label.free")}: ${formatValue(obj?.memory?.free)}`,
    ...(Number.isFinite(obj?.memory?.intellijCapMb)
      ? [`- ${t("label.intellijCap")}: ${formatValue(obj?.memory?.intellijCapMb)} MB`]
      : []),
    ...(ideCaps.length
      ? [`- ${t("label.altIdeCaps")}: ${ideCaps.join("; ")}`]
      : []),
    "",
    t("section.gpu"),
    `- ${t("label.vendor")}: ${formatValue(obj?.gpu?.vendor)}`,
    `- ${t("label.model")}: ${formatValue(obj?.gpu?.chip)}`,
    `- ${t("label.driver")}: ${formatValue(obj?.gpu?.driverVersion)}`,
    `- ${t("label.gpuCount")}: ${formatValue(obj?.gpu?.deviceCount)}`,
    `- ${t("label.gpuDevices")}: ${formatValue(obj?.gpu?.devices)}`,
    `- ${t("label.cores")}: ${formatValue(obj?.gpu?.cores)}`,
    `- ${t("label.speed")}: ${formatValue(obj?.gpu?.speedMHz)} MHz (${formatValue(obj?.gpu?.speedGHz)} GHz)`,
    `- ${t("label.voltage")}: ${formatValue(obj?.gpu?.voltage)}`,
    "",
    t("section.internet"),
    `- ${t("label.test")}: ${formatValue(obj?.internet?.testUrl)}`,
    `- ${t("label.download")}: ${toMBps(obj?.internet?.downloadMbps)} MB/s`,
    `- ${t("label.upload")}: ${toMBps(obj?.internet?.uploadMbps)} MB/s`,
    `- ${t("label.ping")}: ${formatValue(obj?.internet?.pingMs)} ms`,
    `- ${t("label.status")}: ${formatInternetStatus(obj?.internet)}`,
    ...(obj?.network
      ? [
          "",
          t("section.network"),
          `- ${t("label.gateway")}: ${formatValue(obj?.network?.router?.gateway)}`,
          `- ${t("label.routerFirmware")}: ${formatValue(obj?.network?.router?.firmware)}`,
          `- ${t("label.wifi")}: ${formatWifiStatus(obj?.network?.wifi)}`,
          `- ${t("label.lan")}: ${formatValue(obj?.network?.lan?.status)} (${formatValue(obj?.network?.lan?.speed)})`
        ]
      : []),
    ...(obj?.systemSettings
      ? [
          "",
          t("section.system"),
          `- ${t("label.power")}: ${formatValue(obj?.systemSettings?.powerPlan || obj?.systemSettings?.powerSummary)}`
        ]
      : []),
    ...(obj?.process
      ? ["", t("section.process"), `- ${t("label.node")}: ${formatValue(obj?.process?.nodeVersion)}`, `- ${t("label.platform") || "platform"}: ${formatValue(obj?.process?.platform)}`]
      : []),
    ...(obj?.app
      ? [
          "",
          t("section.app"),
          `- ${t("label.name")}: ${formatValue(obj?.app?.name)}`,
          `- ${t("label.version")}: ${formatValue(obj?.app?.version)}`,
          `- ${t("label.electron")}: ${formatValue(obj?.app?.electron)}`,
          `- ${t("label.node")}: ${formatValue(obj?.app?.node)}`,
          `- ${t("label.chrome")}: ${formatValue(obj?.app?.chrome)}`,
          `- ${t("label.javaHome")}: ${formatValue(obj?.app?.javaHome)}`
        ]
      : []),
    ...([].concat(cliMissing, dependencyMissing).length
      ? ["", t("section.work"), `- ${t("label.missingEssentials")}: ${[].concat(cliMissing, dependencyMissing).join(", ")}`]
      : []),
    ...(cliLines.length ? ["", t("section.cli"), ...cliLines] : []),
    ...(softwareLines.length ? ["", t("section.software"), ...softwareLines] : []),
    ...(dependencyLines.length ? ["", t("section.dependencies"), ...dependencyLines] : [])
  ];

  return lines.join("\n");
}

// Build optimization suggestions based on diagnostics and selected mode.
function getSuggestions(diag, approach = "extensive") {
  const suggestions = [];
  if (!diag) return suggestions;
  const addSuggestion = (text) => {
    if (!suggestions.includes(text)) suggestions.push(text);
  };
  if (approach === "brief") {
    addSuggestion(t("suggest.checklist.brief"));
  } else {
    addSuggestion(t("suggest.checklist.extensive"));
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

  const totalMem = Number(diag?.memory?.total?.replace(/[^\d.]/g, "")); // parse total RAM (MB/GB string)
  const freeMem = Number(diag?.memory?.free?.replace(/[^\d.]/g, "")); // parse free RAM (MB/GB string)
  if (Number.isFinite(totalMem) && Number.isFinite(freeMem) && totalMem > 0) {
    const freeRatio = freeMem / totalMem;
    const usedRatio = 1 - freeRatio;
    if (freeRatio < 0.2) {
      addSuggestion(t("suggest.memory.low"));
    }
    if (usedRatio >= 0.9) {
      addSuggestion(t("suggest.memory.veryHigh"));
    } else if (usedRatio >= 0.8) {
      addSuggestion(t("suggest.memory.high"));
    }
    addSuggestion(t("suggest.memory.reserve"));
  }

  const loadAvg = diag?.cpu?.loadAvg;
  const cores = Number(diag?.cpu?.cores);
  if (Array.isArray(loadAvg) && loadAvg.length > 0 && Number.isFinite(cores)) {
    if (loadAvg[0] > cores) {
      addSuggestion(t("suggest.cpu.high"));
    }
  }

  const latency = Number(diag?.internet?.pingMs);
  if (diag?.internet?.ok === false) {
    addSuggestion(t("suggest.internet.failed"));
  } else if (Number.isFinite(latency) && latency > 200) {
    addSuggestion(t("suggest.internet.latency"));
  }

  if (diag?.os?.updateStatus === "updates_available") {
    addSuggestion(t("suggest.os.updates"));
  }

  if (!diag?.gpu) {
    addSuggestion(t("suggest.gpu.full"));
  }

  // Intentionally skip missing tool/dependency suggestions when not installed.

  if (Number.isFinite(diag?.memory?.intellijCapMb) || (diag?.memory?.alternativeIdeCaps || []).length > 0) {
    addSuggestion(t("suggest.ide.cap"));
  }

  const wifiSignal = diag?.network?.wifi?.signal;
  if (wifiSignal) {
    const signalText = String(wifiSignal);
    const percentMatch = signalText.match(/(\d+)\s*%/);
    if (percentMatch && Number(percentMatch[1]) < 60) {
      addSuggestion(t("suggest.wifi.weak"));
    }
    const rssi = Number(signalText.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(rssi) && rssi < 0 && rssi <= -70) {
      addSuggestion(t("suggest.wifi.weakRssi"));
    }
  }

  const powerPlan = String(diag?.systemSettings?.powerPlan || diag?.systemSettings?.powerSummary || "");
  if (platform === "win32" && powerPlan && /balanced|power saver|power saving/i.test(powerPlan)) {
    addSuggestion(t("suggest.power.plan"));
  }

  if (hasSoftware("visual studio code")) {
    addSuggestion(t("suggest.vscode.extensions"));
  }

  const hasJetBrainsIde =
    hasSoftware("intellij") ||
    hasSoftware("pycharm") ||
    hasSoftware("webstorm") ||
    hasSoftware("rider") ||
    hasSoftware("clion") ||
    hasSoftware("datagrip") ||
    hasSoftware("android studio");
  if (hasJetBrainsIde) {
    addSuggestion(t("suggest.jetbrains.tune"));
  }

  if (hasSoftwareExact("Visual Studio")) {
    addSuggestion(t("suggest.vs.parallel"));
  }

  if (hasSoftware("xcode")) {
    addSuggestion(t("suggest.xcode.derived"));
  }

  if (hasSoftware("android studio")) {
    addSuggestion(t("suggest.android.accel"));
  }

  if (hasDependency("javascript") || hasDependency("node")) {
    addSuggestion(t("suggest.node.lts"));
  }

  if (hasDependency("typescript")) {
    addSuggestion(t("suggest.ts.incremental"));
  }

  if (hasDependency("python")) {
    addSuggestion(t("suggest.python.venv"));
  }

  if (hasDependency("java")) {
    addSuggestion(t("suggest.java.lts"));
  }

  if (hasDependency("docker")) {
    const dockerTip = platform === "win32"
      ? t("suggest.docker.windows")
      : t("suggest.docker.mac");
    addSuggestion(dockerTip);
  }

  let finalSuggestions = suggestions;
  if (approach === "brief") {
    finalSuggestions = suggestions.slice(0, 4);
  }

  if (approach === "extensive") {
    const extensiveChecklist = [
      t("checklist.osDrivers"),
      t("checklist.powerPlan"),
      t("checklist.startupApps"),
      t("checklist.diskSpace"),
      t("checklist.ssd"),
      t("checklist.visualEffects"),
      t("checklist.antivirus"),
      t("checklist.wifi"),
      t("checklist.dns"),
      t("checklist.browser"),
      t("checklist.hwAccel"),
      t("checklist.cliTools"),
      t("checklist.reboot")
    ];
    finalSuggestions = finalSuggestions.concat(extensiveChecklist);
  }

  if (approach === "extensive" && finalSuggestions.length) {
    const impact = Math.min(30, 5 + finalSuggestions.length * 3);
    finalSuggestions = [
      ...finalSuggestions,
      t("note.potential", { min: impact, max: Math.min(40, impact + 10) })
    ];
  }

  if (finalSuggestions.length === 0) {
    finalSuggestions.push(t("note.noIssues"));
  }

  return finalSuggestions;
}

function formatForText(obj, options = {}) {
  const suggestions = options.includeOptimization
    ? getSuggestions(obj, options.approach)
    : [t("note.optimization.disabled")];
  return [
    formatForDisplay(obj, options.approach, options),
    "",
    `${t("section.suggestions")}:`,
    ...suggestions.map((item) => `- ${item}`)
  ].join("\n");
}

function formatForPdf(obj, options = {}) {
  const suggestions = options.includeOptimization
    ? getSuggestions(obj, options.approach)
    : [t("note.optimization.disabled")];
  return [
    formatForDisplay(obj, options.approach, options),
    "",
    `${t("section.suggestions")}:`,
    ...suggestions.map((item) => `- ${item}`)
  ].join("\n");
}

// Run diagnostics via the preload API and render results/suggestions.
async function runDiagnostics() {
  const approach = getSelectedValue("approach");
  const approachLabel = approach === "brief" ? "brief" : "extensive";
  statusEl.textContent = t("status.running", { mode: t(`mode.${approachLabel}`) });
  exportBtn.disabled = true;
  if (resultsStatus) resultsStatus.textContent = t("results.status.running");
  showScreen(screenProgress);
  if (progressText) progressText.textContent = t("progress.running", { mode: t(`mode.${approachLabel}`) });
  if (progressFill) progressFill.style.width = "30%";
  const mode = approach === "brief" ? "quick" : "full";
  const includeSoftware = getSelectedCheckbox("extraSoftware", true);
  const includeDependencies = getSelectedCheckbox("extraDependencies", true);
  const includeOptimization = getSelectedCheckbox("extraOptimization", true);

  try {
    const data = await window.diagnostics.run({
      approach,
      mode,
      includeSoftware,
      includeDependencies,
      includeOptimization
    });
    lastOptions = { includeSoftware, includeDependencies, includeOptimization, approach };
    lastBaselineDiff = null;
    lastResults = data;
    resultsEl.textContent = formatForDisplay(data, approach, {
      includeOptimization,
      baselineDiff: lastBaselineDiff
    });
    const suggestions = includeOptimization ? getSuggestions(data, approach) : [t("note.optimization.disabled")];
    renderSuggestions(suggestions);
    if (timestampEl) timestampEl.textContent = new Date().toLocaleString();
    statusEl.textContent = t("status.complete", { mode: t(`mode.${approachLabel}`) });
    if (resultsStatus) resultsStatus.textContent = t("results.status.complete");
    exportBtn.disabled = false;
    if (progressText) progressText.textContent = t("status.wrapping");
    if (progressFill) progressFill.style.width = "100%";
    showScreen(screenResults);
  } catch (err) {
    statusEl.textContent = t("status.failed");
    if (resultsStatus) resultsStatus.textContent = t("results.status.failed");
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
  statusEl.textContent = t("status.exporting", { format: format.toUpperCase() });
  const options = {
    approach: lastOptions?.approach,
    includeOptimization: lastOptions?.includeOptimization,
    baselineDiff: lastBaselineDiff
  };
  const contentText = formatForText(lastResults, options);
  const contentHtml = formatForPdf(lastResults, options)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const exportPayload = buildExportPayload(
    lastResults,
    options.approach,
    options.includeOptimization,
    options.baselineDiff
  );
  const contentJson = JSON.stringify(exportPayload, null, 2);
  const contentCsv = formatCsvExport(exportPayload);

  try {
    const res = await window.diagnostics.exportResults({
      format,
      contentText,
      contentHtml,
      contentJson,
      contentCsv
    });
    if (res?.error) {
      statusEl.textContent = t("status.export.failed");
      return;
    }
    statusEl.textContent = res.saved ? t("status.export.complete") : t("status.export.canceled");
  } catch (err) {
    statusEl.textContent = t("status.export.failed");
  }
}

async function saveBaseline() {
  if (!lastResults) return;
  statusEl.textContent = t("status.baseline.saving");
  try {
    const res = await window.diagnostics.saveBaseline({ current: lastResults });
    if (res?.error) {
      statusEl.textContent = t("status.baseline.failed");
      return;
    }
    statusEl.textContent = res.saved
      ? t("status.baseline.saved")
      : t("status.baseline.canceled");
  } catch (err) {
    statusEl.textContent = t("status.baseline.failed");
  }
}

async function compareBaseline() {
  if (!lastResults) return;
  statusEl.textContent = t("status.baseline.loading");
  try {
    const res = await window.diagnostics.compareBaseline({ current: lastResults });
    if (!res || res.canceled) {
      statusEl.textContent = t("status.baseline.canceled");
      return;
    }
    if (res.error) {
      statusEl.textContent = t("status.baseline.failed");
      return;
    }
    if (!res.ok) {
      statusEl.textContent = t("status.baseline.failed");
      return;
    }
    lastBaselineDiff = res.diff || [];
    resultsEl.textContent = formatForDisplay(lastResults, lastOptions?.approach, {
      includeOptimization: lastOptions?.includeOptimization,
      baselineDiff: lastBaselineDiff
    });
    statusEl.textContent = t("status.baseline.compare.complete");
  } catch (err) {
    statusEl.textContent = t("status.baseline.failed");
  }
}

if (detectLanguageBtn) {
  detectLanguageBtn.addEventListener("click", detectLanguage);
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!target || target.name !== "language") return;
  const value = target.value;
  if (value) setLanguage(value, false);
});

if (languageContinue) {
  languageContinue.addEventListener("click", async () => {
    const selected = getSelectedValue("language") || DEFAULT_LANG;
    await setLanguage(selected, true);
    showScreen(screenStart);
    statusEl.textContent = t("status.ready");
  });
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
if (exportJson) {
  exportJson.addEventListener("click", async () => {
    closeModal();
    await exportResults("json");
  });
}
if (exportCsv) {
  exportCsv.addEventListener("click", async () => {
    closeModal();
    await exportResults("csv");
  });
}

if (saveBaselineBtn) {
  saveBaselineBtn.addEventListener("click", saveBaseline);
}
if (compareBaselineBtn) {
  compareBaselineBtn.addEventListener("click", compareBaseline);
}

if (closeApp) {
  closeApp.addEventListener("click", () => {
    window.close();
  });
}

  if (startPreviousBtn) {
    startPreviousBtn.addEventListener("click", () => {
      showScreen(screenStart);
      statusEl.textContent = t("status.ready");
    });
  }

async function runSetup(action) {
  if (!window.diagnostics?.runSetup) return;
  setupStatus.textContent = action === "install" ? t("setup.status.installing") : t("setup.status.starting");
  try {
    const res = await window.diagnostics.runSetup(action);
    setupStatus.textContent = res.ok ? t("setup.status.done") : t("results.status.failed");
    if (res.output) {
      resultsEl.textContent = res.output;
    }
  } catch (err) {
    setupStatus.textContent = t("results.status.failed");
    resultsEl.textContent = `Error: ${err.message || err}`;
  }
}

if (setupInstall) {
  setupInstall.addEventListener("click", () => runSetup("install"));
}

  if (setupStart) {
    setupStart.addEventListener("click", () => runSetup("start"));
  }

  if (languageApply && languageSelect) {
    languageApply.addEventListener("click", async () => {
      await setLanguage(languageSelect.value, true);
    });
  }

  window.addEventListener("resize", adjustLanguageScale);

  initLanguage();
