const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let win;

const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    title: "Knights Acquisitions",
    titleBarStyle: "hidden",
    ...(process.platform !== "darwin"
      ? {
          titleBarOverlay: {
            color: "#1a2933",
            symbolColor: "#ffffff",
          },
        }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("index.html");
};

// --- IPC handlers ---

// Auth stubs: implemented in the auth feature commit
ipcMain.handle("auth:signup", async (_event, { username, password }) => {
  return { ok: false, error: "Not implemented yet" };
});

ipcMain.handle("auth:login", async (_event, { username, password }) => {
  return { ok: false, error: "Not implemented yet" };
});

ipcMain.handle("auth:logout", async () => {
  win.loadFile("index.html");
  return { ok: true };
});

// Navigation: only allow known pages so renderers can't load arbitrary files
const PAGES = {
  auth: "index.html",
  vault: "vault.html",
};

ipcMain.handle("navigate", async (_event, page) => {
  const file = PAGES[page];
  if (!file) return { ok: false, error: `Unknown page: ${page}` };
  win.loadFile(file);
  return { ok: true };
});

// Vault stubs: implemented in the vault feature commit
ipcMain.handle("vault:get-entries", async () => []);
ipcMain.handle("vault:add-entry", async (_event, entry) => ({ ok: false, error: "Not implemented yet" }));
ipcMain.handle("vault:update-entry", async (_event, { id, entry }) => ({ ok: false, error: "Not implemented yet" }));
ipcMain.handle("vault:delete-entry", async (_event, id) => ({ ok: false, error: "Not implemented yet" }));

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});