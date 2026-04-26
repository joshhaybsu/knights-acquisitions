const { app, BrowserWindow, ipcMain } = require("electron");
const path   = require("path");
const fs     = require("fs");
const crypto = require("crypto");

let win;
let currentUser = null; // { id, username, isAdmin } — set on login, cleared on logout

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

// ── Admin key ─────────────────────────────────────────────────────────────────
// Generated once on first launch and written to <userData>/admin-key.txt.
// Anyone who needs to create an admin account reads it from that file.

function adminKeyFilePath() {
  return path.join(app.getPath("userData"), "admin-key.txt");
}

function getOrCreateAdminKey() {
  const keyPath = adminKeyFilePath();
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf8").trim();
  }
  const key = crypto.randomBytes(24).toString("hex");
  fs.writeFileSync(keyPath, key, "utf8");
  return key;
}

let ADMIN_KEY; // loaded after app is ready (userData path not available before)

// ── User database helpers ─────────────────────────────────────────────────────
// Stored as a JSON array at <userData>/users.json
// Each entry: { id, username, hash, salt, createdAt, isAdmin }
// Sensitive fields (hash, salt) are never sent to renderers.

function usersFilePath() {
  return path.join(app.getPath("userData"), "users.json");
}

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(usersFilePath(), "utf8"));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(usersFilePath(), JSON.stringify(users, null, 2), "utf8");
}

function hashPassword(password, salt) {
  // PBKDF2-SHA512, 100 000 iterations — proper KDF, not a plain hash
  return crypto
    .pbkdf2Sync(password, salt, 100_000, 64, "sha512")
    .toString("hex");
}

// ── Auth IPC ──────────────────────────────────────────────────────────────────

ipcMain.handle("auth:signup", async (_event, { username, password, adminKey }) => {
  const users = readUsers();

  if (users.some((u) => u.username === username)) {
    return { ok: false, error: "That username is already taken." };
  }

  // Admin key must match exactly — wrong key silently creates a standard account
  // (avoids leaking whether the key was correct)
  const isAdmin = adminKey != null && adminKey === ADMIN_KEY;

  const salt = crypto.randomBytes(32).toString("hex");
  const hash = hashPassword(password, salt);

  users.push({
    id:        crypto.randomBytes(16).toString("hex"),
    username,
    hash,
    salt,
    createdAt: new Date().toISOString(),
    isAdmin,
  });

  writeUsers(users);
  return { ok: true };
});

// Sean start
ipcMain.handle("auth:login", async (_event, { username, password }) => {
  const users = readUsers();
  const user  = users.find((u) => u.username === username);

  // Same error message for unknown user vs wrong password (prevents enumeration)
  if (!user) return { ok: false, error: "Invalid username or password." };

  const hash = hashPassword(password, user.salt);
  if (hash !== user.hash) return { ok: false, error: "Invalid username or password." };

  currentUser = { id: user.id, username: user.username, isAdmin: user.isAdmin };
  return { ok: true, isAdmin: user.isAdmin };
});
// Sean end

// Sean start
ipcMain.handle("auth:logout", async () => {
  currentUser = null;
  win.loadFile("index.html");
  return { ok: true };
});
// Sean end

ipcMain.handle("auth:me", async () => {
  return currentUser; // null if not logged in
});

// ── Admin IPC ─────────────────────────────────────────────────────────────────

ipcMain.handle("admin:get-users", async () => {
  if (!currentUser?.isAdmin) return { ok: false, error: "Unauthorized." };

  const users = readUsers().map(({ id, username, createdAt, isAdmin }) => ({
    id, username, createdAt, isAdmin,
  }));

  return { ok: true, users };
});

ipcMain.handle("admin:delete-user", async (_event, id) => {
  if (!currentUser?.isAdmin) return { ok: false, error: "Unauthorized." };
  if (currentUser.id === id) return { ok: false, error: "You cannot delete your own account." };

  const users = readUsers().filter((u) => u.id !== id);
  writeUsers(users);
  return { ok: true };
});

// ── Navigation ────────────────────────────────────────────────────────────────
// Allowlist prevents renderers from loading arbitrary files via navigate()

const PAGES = {
  auth:    "index.html",
  vault:   "vault.html",
  admin:   "admin.html",
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

// ── Vault stubs: implemented in the vault feature commit ──────────────────────
ipcMain.handle("vault:get-entries", async () => []);
ipcMain.handle("vault:add-entry",    async (_event, _entry) => ({ ok: false, error: "Not implemented yet" }));
ipcMain.handle("vault:update-entry", async (_event, _args)  => ({ ok: false, error: "Not implemented yet" }));
ipcMain.handle("vault:delete-entry", async (_event, _id)    => ({ ok: false, error: "Not implemented yet" }));

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  ADMIN_KEY = getOrCreateAdminKey();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
