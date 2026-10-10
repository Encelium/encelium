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
    answer: (input) => ipcRenderer.invoke("agent:answer", input),
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
    /** A picture pasted with Ctrl+V (base64), saved as a file so it can be attached. */
    savePasted: (input) => ipcRenderer.invoke("attachments:save-pasted", input),
    thumbnail: (input) => ipcRenderer.invoke("attachments:thumbnail", input),
    /** Files dropped on the window: resolve their paths here (the page can't see paths). */
    describeDropped: (files) => ipcRenderer.invoke("attachments:describe", { paths: Array.from(files, (f) => webUtils.getPathForFile(f)).filter(Boolean) }),
  },
  tasks: {
    list: () => ipcRenderer.invoke("tasks:list"),
    events: (input) => ipcRenderer.invoke("tasks:events", input),
    delete: (input) => ipcRenderer.invoke("tasks:delete", input),
    rename: (input) => ipcRenderer.invoke("tasks:rename", input),
    /** A notification was clicked: open that task. */
    onOpenRequest: (callback) => {
      const handler = (_event, taskId) => callback(taskId);
      ipcRenderer.on("task:open", handler);
      return () => ipcRenderer.removeListener("task:open", handler);
    },
    openFolder: (input) => ipcRenderer.invoke("tasks:open-folder", input),
    chooseFolder: () => ipcRenderer.invoke("folder:choose"),
    findPreview: (input) => ipcRenderer.invoke("preview:find", input),
    openPreview: (input) => ipcRenderer.invoke("preview:open", input),
    listFiles: (input) => ipcRenderer.invoke("files:list", input),
    readFile: (input) => ipcRenderer.invoke("files:read", input),
    showFile: (input) => ipcRenderer.invoke("files:show", input),
    saveZip: (input) => ipcRenderer.invoke("files:zip", input),
    onFilesChanged: (callback) => {
      const handler = (_event, taskId) => callback(taskId);
      ipcRenderer.on("task:files-changed", handler);
      return () => ipcRenderer.removeListener("task:files-changed", handler);
    },
  },
  window: {
    setCompact: (on) => ipcRenderer.invoke("window:compact", !!on),
    setOnTop: (on) => ipcRenderer.invoke("window:on-top", !!on),
    /** null clears it; value 0..1, or no value for a moving bar. */
    setProgress: (state) => ipcRenderer.invoke("window:progress", state),
  },
  copyText: (text) => ipcRenderer.invoke("clipboard:write", text),
  recipes: {
    list: () => ipcRenderer.invoke("recipes:list"),
    save: (input) => ipcRenderer.invoke("recipes:save", input),
    delete: (input) => ipcRenderer.invoke("recipes:delete", input),
  },
  onEffectiveTheme: (callback) => {
    const handler = (_event, theme) => callback(theme);
    ipcRenderer.on("theme:effective", handler);
    return () => ipcRenderer.removeListener("theme:effective", handler);
  },
});
