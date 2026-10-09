// The only bridge between the window and the main process. Keep it small.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("enceladus", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch) => ipcRenderer.invoke("settings:set", patch),
  models: {
    presets: () => ipcRenderer.invoke("model:presets"),
    get: () => ipcRenderer.invoke("model:get"),
    test: (input) => ipcRenderer.invoke("model:test", input),
    save: (input) => ipcRenderer.invoke("model:save", input),
    reset: () => ipcRenderer.invoke("model:reset"),
  },
  onEffectiveTheme: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on("theme:effective", handler);
    return () => ipcRenderer.removeListener("theme:effective", handler);
  },
});
