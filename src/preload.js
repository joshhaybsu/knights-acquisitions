const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Auth
  signup: (username, password) =>
    ipcRenderer.invoke("auth:signup", { username, password }),
  login: (username, password) =>
    ipcRenderer.invoke("auth:login", { username, password }),
  logout: () => ipcRenderer.invoke("auth:logout"),

  // Vault
  getEntries: () => ipcRenderer.invoke("vault:get-entries"),
  addEntry: (entry) => ipcRenderer.invoke("vault:add-entry", entry),
  updateEntry: (id, entry) => ipcRenderer.invoke("vault:update-entry", { id, entry }),
  deleteEntry: (id) => ipcRenderer.invoke("vault:delete-entry", id),

  // Navigation (main process drives window.loadFile)
  navigate: (page) => ipcRenderer.invoke("navigate", page),
});
