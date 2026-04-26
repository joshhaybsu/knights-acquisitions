const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Auth
  signup:  (username, password, adminKey) => ipcRenderer.invoke("auth:signup", { username, password, adminKey }),
  login:   (username, password) => ipcRenderer.invoke("auth:login",  { username, password }),
  logout:  ()                   => ipcRenderer.invoke("auth:logout"),
  me:      ()                   => ipcRenderer.invoke("auth:me"),

  // Admin
  getUsers:   ()   => ipcRenderer.invoke("admin:get-users"),
  deleteUser: (id) => ipcRenderer.invoke("admin:delete-user", id),

  // Vault
  getEntries:  ()            => ipcRenderer.invoke("vault:get-entries"),
  addEntry:    (entry)       => ipcRenderer.invoke("vault:add-entry",    entry),
  updateEntry: (id, entry)   => ipcRenderer.invoke("vault:update-entry", { id, entry }),
  deleteEntry: (id)          => ipcRenderer.invoke("vault:delete-entry", id),

  // Navigation (main process drives window.loadFile)
  navigate: (page) => ipcRenderer.invoke("navigate", page),
});
