const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("diagnostics", {
  run: (options) => ipcRenderer.invoke("run-diagnostics", options),
  exportResults: (payload) => ipcRenderer.invoke("export-results", payload),
  runSetup: (action) => ipcRenderer.invoke("run-setup", action),
  platform: process.platform
});
