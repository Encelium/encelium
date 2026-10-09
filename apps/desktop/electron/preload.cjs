// The only bridge between the window and the main process. Keep it small.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("enceladus", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),
  onEffectiveTheme: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on("theme:effective", handler);
    return () => ipcRenderer.removeListener("theme:effective", handler);
  },
});
