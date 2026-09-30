const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pharmaDesktop", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  getUpdateStatus: () => ipcRenderer.invoke("updater:get-status"),
  onUpdateStatus(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("onUpdateStatus requires a function listener.");
    }
  
    const handler = (_event, status) => listener(status);
    ipcRenderer.on("updater:status", handler);
    return () => ipcRenderer.removeListener("updater:status", handler);
  },
  installUpdate: () => ipcRenderer.send("updater:install"),
});