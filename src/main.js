const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs   = require("fs");
const crypto = require("crypto");

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

// ── Auth helpers ──────────────────────────────────────────────────────────────
function authFilePath() {
  return path.join(app.getPath("userData"), "auth.json");
}

function readAuth() {
  try {
    return JSON.parse(fs.readFileSync(authFilePath(), "utf8"));
  } catch {
    return null;
  }
}

function writeAuth(data) {
  fs.writeFileSync(authFilePath(), JSON.stringify(data, null, 2), "utf8");
}

function hashPassword(password, salt) {
  // PBKDF2-SHA512, 100 000 iterations — proper KDF, not a plain hash
  return crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
}

// --- IPC handlers ---

ipcMain.handle("auth:signup", async (_event, { username, password }) => {
  if (readAuth()) {
    return { ok: false, error: "An account already exists on this device." };
  }

  const salt = crypto.randomBytes(32).toString("hex");
  const hash = hashPassword(password, salt);
  writeAuth({ username, hash, salt });

  return { ok: true };
});

ipcMain.handle("auth:login", async (_event, { username, password }) => {
  const auth = readAuth();
  if (!auth) {
    return { ok: false, error: "No account found. Please create one first." };
  }
  if (auth.username !== username) {
    return { ok: false, error: "Invalid username or password." };
  }

  const hash = hashPassword(password, auth.salt);
  if (hash !== auth.hash) {
    return { ok: false, error: "Invalid username or password." };
  }

  return { ok: true };
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