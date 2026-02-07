function isNetworkPath(targetPath) {
  const value = String(targetPath || "");
  return value.startsWith("\\\\") || value.includes("://");
}

module.exports = { isNetworkPath };
