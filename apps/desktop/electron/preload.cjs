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
  agent: {
    start: (input) => ipcRenderer.invoke("agent:start", input),
    respond: (input) => ipcRenderer.invoke("agent:respond", input),
    stop: (input) => ipcRenderer.invoke("agent:stop", input),
    restore: (input) => ipcRenderer.invoke("agent:restore", input),
    onEvent: (callback) => {
      const handler = (_event, runId, agentEvent) => callback(runId, agentEvent);
      ipcRenderer.on("agent:event", handler);
      return () => ipcRenderer.removeListener("agent:event", handler);
    },
  },
  tasks: {
    list: () => ipcRenderer.invoke("tasks:list"),
    events: (input) => ipcRenderer.invoke("tasks:events", input),
    chooseFolder: () => ipcRenderer.invoke("folder:choose"),
    findPreview: (input) => ipcRenderer.invoke("preview:find", input),
    openPreview: (input) => ipcRenderer.invoke("preview:open", input),
    onFilesChanged: (callback) => {
      const handler = (_event, taskId) => callback(taskId);
      ipcRenderer.on("task:files-changed", handler);
      return () => ipcRenderer.removeListener("task:files-changed", handler);
    },
  },
  onEffectiveTheme: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on("theme:effective", handler);
    return () => ipcRenderer.removeListener("theme:effective", handler);
  },
});
