const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let win;

// Sean start
let isAuthenticated = false;
// Sean end

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

ipcMain.handle("auth:signup", async (_event, { username, password }) => {
  return { ok: false, error: "Not implemented yet" };
});

// Sean start
ipcMain.handle("auth:login", async (_event, { username, password }) => {
  if (!username || !password) {
    return { ok: false, error: "Missing username or password" };
  }

  isAuthenticated = true;
  win.loadFile("vault.html");

  return { ok: true };
});
// Sean end

// Sean start
ipcMain.handle("auth:logout", async () => {
  isAuthenticated = false;
  win.loadFile("index.html");
  return { ok: true };
});
// Sean end

const PAGES = {
  auth: "index.html",
  vault: "vault.html",
};

// Sean start
ipcMain.handle("navigate", async (_event, page) => {
  const file = PAGES[page];

  if (!file) return { ok: false, error: `Unknown page: ${page}` };

  if (page === "vault" && !isAuthenticated) {
    return { ok: false, error: "Access denied. Please log in first." };
  }

  win.loadFile(file);
  return { ok: true };
});
// Sean end

ipcMain.handle("vault:get-entries", async () => []);
ipcMain.handle("vault:add-entry", async (_event, entry) => ({
  ok: false,
  error: "Not implemented yet",
}));
ipcMain.handle("vault:update-entry", async (_event, { id, entry }) => ({
  ok: false,
  error: "Not implemented yet",
}));
ipcMain.handle("vault:delete-entry", async (_event, id) => ({
  ok: false,
  error: "Not implemented yet",
}));

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
