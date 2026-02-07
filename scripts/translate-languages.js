const fs = require("fs");
const https = require("https");

const sourceLang = "en";
const languagesDir = "languages";
const base = JSON.parse(fs.readFileSync(`${languagesDir}/en-GB.json`, "utf8"));
const baseStrings = base.strings || {};

const targetMap = {
  "en-US": "en",
  "pt-BR": "pt-BR",
  "es-419": "es",
  fil: "tl",
  he: "iw"
};

const protectedTokens = [
  "Setup_tester",
  "Wi-Fi",
  "LAN",
  "CPU",
  "GPU",
  "IDE",
  "CLI",
  "OS",
  "IP",
  "DNS",
  "Node.js",
  "TypeScript",
  "VS Code",
  "JetBrains",
  "IntelliJ",
  "Android Studio",
  "Visual Studio",
  "Xcode",
  "Docker",
  "Gradle",
  "Maven",
  "MB/s",
  "GHz",
  "MHz",
  "MB",
  "GB",
  "TB",
  "n/a"
];

const maskTokens = (text) => {
  let output = text;
  const replacements = [];
  protectedTokens.forEach((token, index) => {
    if (!output.includes(token)) return;
    const placeholder = `__TOK_${index}__`;
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    output = output.replace(regex, placeholder);
    replacements.push([placeholder, token]);
  });
  const placeholderMatches = output.match(/\{[^\}]+\}/g) || [];
  placeholderMatches.forEach((match, index) => {
    const placeholder = `__VAR_${index}__`;
    output = output.replace(match, placeholder);
    replacements.push([placeholder, match]);
  });
  return { output, replacements };
};

const unmaskTokens = (text, replacements) => {
  let output = text;
  replacements.forEach(([placeholder, token]) => {
    const regex = new RegExp(placeholder, "g");
    output = output.replace(regex, token);
  });
  return output;
};

const translateBatch = (targetLang, texts) =>
  new Promise((resolve, reject) => {
    const separator = "\n<<<SEP>>>\n";
    const joined = texts.join(separator);
    const encoded = encodeURIComponent(joined);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encoded}`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const translated = parsed?.[0]?.map((item) => item[0]).join("") || "";
            const parts = translated.split("<<<SEP>>>");
            if (parts.length !== texts.length) {
              resolve(null);
              return;
            }
            resolve(parts.map((part) => part.trim()));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });

const translateText = (targetLang, text) =>
  new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encoded}`;
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const translated = parsed?.[0]?.map((item) => item[0]).join("") || "";
            resolve(translated);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const translateLanguage = async (code) => {
  const filePath = `${languagesDir}/${code}.json`;
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const strings = data.strings || {};
  const sameKeys = Object.keys(baseStrings).filter(
    (key) => strings[key] === baseStrings[key]
  );

  if (!sameKeys.length) {
    return { code, updated: 0 };
  }

  const targetLang = targetMap[code] || code;
  const masked = sameKeys.map((key) => maskTokens(strings[key]));
  const maskedTexts = masked.map((entry) => entry.output);
  const chunks = chunkArray(maskedTexts, 25);
  const results = [];

  for (let i = 0; i < chunks.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const batchTranslated = await translateBatch(targetLang, chunks[i]);
    if (!batchTranslated) {
      for (const item of chunks[i]) {
        // eslint-disable-next-line no-await-in-loop
        const translated = await translateText(targetLang, item);
        results.push(translated);
      }
    } else {
      results.push(...batchTranslated);
    }
  }

  sameKeys.forEach((key, index) => {
    const value = results[index] || strings[key];
    const repaired = unmaskTokens(value, masked[index].replacements);
    strings[key] = repaired;
  });

  data.strings = strings;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return { code, updated: sameKeys.length };
};

const run = async () => {
  const files = fs.readdirSync(languagesDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const code = file.replace(/\.json$/, "");
    if (code === "en-GB") continue;
    // eslint-disable-next-line no-await-in-loop
    const result = await translateLanguage(code);
    console.log(`${result.code}: translated ${result.updated} entries`);
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
