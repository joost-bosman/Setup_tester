const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "docs", "EXPLAINED.md");
const outputPath = path.join(__dirname, "..", "docs", "explained.html");

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const inlineFormat = (value) => {
  let text = escapeHtml(value);
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  return text;
};

const lines = fs.readFileSync(inputPath, "utf8").split(/\r?\n/);
let html = "";
let inCode = false;
let listType = null;

const closeList = () => {
  if (listType) {
    html += `</${listType}>\n`;
    listType = null;
  }
};

for (const line of lines) {
  if (line.startsWith("```")) {
    if (inCode) {
      html += "</code></pre>\n";
      inCode = false;
    } else {
      closeList();
      html += "<pre><code>";
      inCode = true;
    }
    continue;
  }

  if (inCode) {
    html += `${escapeHtml(line)}\n`;
    continue;
  }

  if (line.trim() === "---") {
    closeList();
    html += "<hr />\n";
    continue;
  }

  if (line.startsWith("# ")) {
    closeList();
    html += `<h1>${inlineFormat(line.slice(2).trim())}</h1>\n`;
    continue;
  }
  if (line.startsWith("## ")) {
    closeList();
    html += `<h2>${inlineFormat(line.slice(3).trim())}</h2>\n`;
    continue;
  }
  if (line.startsWith("### ")) {
    closeList();
    html += `<h3>${inlineFormat(line.slice(4).trim())}</h3>\n`;
    continue;
  }

  const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
  if (orderedMatch) {
    if (listType !== "ol") {
      closeList();
      listType = "ol";
      html += "<ol>\n";
    }
    html += `<li>${inlineFormat(orderedMatch[1])}</li>\n`;
    continue;
  }

  const unorderedMatch = line.match(/^-\\s+(.*)$/);
  if (unorderedMatch) {
    if (listType !== "ul") {
      closeList();
      listType = "ul";
      html += "<ul>\n";
    }
    html += `<li>${inlineFormat(unorderedMatch[1])}</li>\n`;
    continue;
  }

  if (line.trim() === "") {
    closeList();
    html += "\n";
    continue;
  }

  closeList();
  html += `<p>${inlineFormat(line.trim())}</p>\n`;
}

closeList();

const template = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Setup_tester - Explained</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", Arial, sans-serif;
        line-height: 1.6;
        color: #111;
      }
      body {
        margin: 32px;
        background: #f8f9fb;
      }
      .page {
        max-width: 900px;
        margin: 0 auto;
        background: #fff;
        padding: 28px 32px;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      }
      h1, h2, h3 {
        margin: 0 0 12px;
      }
      h2 {
        border-bottom: 1px solid #e4e7ee;
        padding-bottom: 6px;
        margin-top: 28px;
      }
      ul, ol {
        padding-left: 20px;
      }
      pre {
        background: #f2f4f8;
        padding: 12px;
        border-radius: 10px;
        overflow-x: auto;
      }
      code {
        font-family: "Consolas", "SFMono-Regular", monospace;
        background: #f2f4f8;
        padding: 2px 6px;
        border-radius: 6px;
      }
      hr {
        border: none;
        border-top: 1px solid #e4e7ee;
        margin: 28px 0;
      }
    </style>
  </head>
  <body>
    <div class="page">
${html}
    </div>
  </body>
</html>
`;

fs.writeFileSync(outputPath, template, "utf8");
