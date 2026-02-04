const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("diagnostics", {
  run: (options) => ipcRenderer.invoke("run-diagnostics", options),
  exportResults: (payload) => ipcRenderer.invoke("export-results", payload)
});
