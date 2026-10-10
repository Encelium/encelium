// The only bridge between the window and the main process. Keep it small.
const { contextBridge, ipcRenderer, webUtils } = require("electron");

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
  attachments: {
    choose: () => ipcRenderer.invoke("attachments:choose"),
    /** Files dropped on the window: resolve their paths here (the page can't see paths). */
    describeDropped: (files) => ipcRenderer.invoke("attachments:describe", { paths: Array.from(files, (f) => webUtils.getPathForFile(f)).filter(Boolean) }),
  },
  tasks: {
    list: () => ipcRenderer.invoke("tasks:list"),
    events: (input) => ipcRenderer.invoke("tasks:events", input),
    delete: (input) => ipcRenderer.invoke("tasks:delete", input),
    openFolder: (input) => ipcRenderer.invoke("tasks:open-folder", input),
    chooseFolder: () => ipcRenderer.invoke("folder:choose"),
    findPreview: (input) => ipcRenderer.invoke("preview:find", input),
    openPreview: (input) => ipcRenderer.invoke("preview:open", input),
    listFiles: (input) => ipcRenderer.invoke("files:list", input),
    readFile: (input) => ipcRenderer.invoke("files:read", input),
    showFile: (input) => ipcRenderer.invoke("files:show", input),
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
