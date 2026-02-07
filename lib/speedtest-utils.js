function summarizeSpeedtestResults(hosts, results) {
  const okResults = results.filter(
    (item) =>
      Number.isFinite(item.downloadMbps) &&
      Number.isFinite(item.uploadMbps) &&
      Number.isFinite(item.pingMs)
  );

  const failed = results.filter(
    (item) =>
      !Number.isFinite(item.downloadMbps) ||
      !Number.isFinite(item.uploadMbps) ||
      !Number.isFinite(item.pingMs)
  );

  if (okResults.length === 0) {
    const hasCaptive = results.some((item) => item.captive);
    const hasDownloadOnly = results.some((item) => item.downloadOk && !item.uploadOk);
    return {
      ok: false,
      pingMs: null,
      downloadMbps: null,
      uploadMbps: null,
      errorCode: hasCaptive
        ? "note.speedtest.captive"
        : hasDownloadOnly
          ? "note.speedtest.uploadUnavailable"
          : "note.speedtest.unavailable",
      error: `Speed test failed for: ${failed.map((item) => item.name).join(", ")}`
    };
  }

  const avg = (values) => values.reduce((sum, val) => sum + val, 0) / values.length;
  const pingMs = avg(okResults.map((item) => item.pingMs));
  const downloadMbps = avg(okResults.map((item) => item.downloadMbps));
  const uploadMbps = avg(okResults.map((item) => item.uploadMbps));
  const allSourcesOk = okResults.length === hosts.length;

  return {
    ok: true,
    pingMs: Number.isFinite(pingMs) ? Math.round(pingMs) : null,
    downloadMbps: Number.isFinite(downloadMbps) ? Number(downloadMbps.toFixed(2)) : null,
    uploadMbps: Number.isFinite(uploadMbps) ? Number(uploadMbps.toFixed(2)) : null,
    sources: okResults.map((item) => item.name),
    sourceCount: okResults.length,
    noteCode: allSourcesOk ? null : "note.speedtest.singleSource",
    note: allSourcesOk ? null : "Result based on a single source."
  };
}

module.exports = { summarizeSpeedtestResults };
