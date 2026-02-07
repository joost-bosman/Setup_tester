const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const { summarizeSpeedtestResults } = require("../lib/speedtest-utils");
const { isNetworkPath } = require("../lib/path-utils");
const { formatCsvExport } = require("../lib/csv-utils");

const testSpeedtestSummary = () => {
  const hosts = [{ name: "fastly" }, { name: "akamai" }];

  const okResults = summarizeSpeedtestResults(hosts, [
    { name: "fastly", pingMs: 10, downloadMbps: 100, uploadMbps: 20, downloadOk: true, uploadOk: true },
    { name: "akamai", pingMs: 20, downloadMbps: 80, uploadMbps: 10, downloadOk: true, uploadOk: true }
  ]);
  assert(okResults.ok === true, "Expected ok results");
  assert(okResults.sourceCount === 2, "Expected two sources");
  assert(okResults.noteCode === null, "Expected no single-source note");

  const singleSource = summarizeSpeedtestResults(hosts, [
    { name: "fastly", pingMs: 10, downloadMbps: 100, uploadMbps: 20, downloadOk: true, uploadOk: true },
    { name: "akamai", pingMs: null, downloadMbps: null, uploadMbps: null, downloadOk: false, uploadOk: false }
  ]);
  assert(singleSource.ok === true, "Expected ok for single source");
  assert(singleSource.sourceCount === 1, "Expected single source count");
  assert(singleSource.noteCode === "note.speedtest.singleSource", "Expected single-source note");

  const uploadUnavailable = summarizeSpeedtestResults(hosts, [
    { name: "fastly", pingMs: 10, downloadMbps: 100, uploadMbps: null, downloadOk: true, uploadOk: false },
    { name: "akamai", pingMs: 20, downloadMbps: 90, uploadMbps: null, downloadOk: true, uploadOk: false }
  ]);
  assert(uploadUnavailable.ok === false, "Expected failure when upload missing");
  assert(uploadUnavailable.errorCode === "note.speedtest.uploadUnavailable", "Expected upload unavailable note");
};

const testNetworkPath = () => {
  assert(isNetworkPath("\\\\server\\share\\file.txt") === true, "UNC path should be blocked");
  assert(isNetworkPath("smb://server/share/file.txt") === true, "URI path should be blocked");
  assert(isNetworkPath("C:\\\\temp\\\\file.txt") === false, "Local path should be allowed");
};

const testCsvFlatten = () => {
  const payload = {
    list: [{ name: "one" }, { name: "two" }],
    values: [1, 2],
    empty: [],
    diacritics: "Cafe\u0301, na\u00efve, Espa\u00f1a, \u017d\u00f3\u0142\u0107",
    emoji: "\ud83d\ude80"
  };
  const csv = formatCsvExport(payload, "\n");
  assert(csv.includes("\"list[0].name\",\"one\""), "Expected array object flattening");
  assert(csv.includes("\"list[1].name\",\"two\""), "Expected array object flattening index 1");
  assert(csv.includes("\"values[0]\",\"1\""), "Expected array value flattening index 0");
  assert(csv.includes("\"values[1]\",\"2\""), "Expected array value flattening index 1");
  assert(csv.includes("\"empty\",\"\""), "Expected empty array entry");
  assert(csv.includes("Cafe\u0301"), "Expected combining diacritics preserved");
  assert(csv.includes("Espa\u00f1a"), "Expected n tilde preserved");
  assert(csv.includes("\u017d\u00f3\u0142\u0107"), "Expected Polish diacritics preserved");
  assert(csv.includes("\ud83d\ude80"), "Expected emoji preserved");
};

const run = () => {
  testSpeedtestSummary();
  testNetworkPath();
  testCsvFlatten();
  console.log("All tests passed.");
};

run();
