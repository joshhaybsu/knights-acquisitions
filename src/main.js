const { app, BrowserWindow, ipcMain } = require("electron");
const path   = require("path");
const fs     = require("fs");
const crypto = require("crypto");

let win;
let currentUser = null; // { id, username, isAdmin, encKey } — set on login, cleared on logout

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

// ── Vault encryption helpers ──────────────────────────────────────────────────
// Each user's vault entries are AES-256-GCM encrypted with a key derived
// from their master password. The key lives in memory only; it is never
// written to disk.

function deriveVaultKey(password, salt) {
  // Different derivation context from the auth hash ("vault" suffix on salt)
  return crypto.pbkdf2Sync(password, salt + ":vault", 100_000, 32, "sha512");
}

function encryptEntry(plainObj, encKey) {
  const iv         = crypto.randomBytes(12);
  const cipher     = crypto.createCipheriv("aes-256-gcm", encKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(plainObj), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    iv:   iv.toString("hex"),
    tag:  tag.toString("hex"),
    data: ciphertext.toString("hex"),
  };
}

function decryptEntry(envelope, encKey) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encKey,
    Buffer.from(envelope.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(envelope.data, "hex")),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString("utf8"));
}

// ── Vault file helpers ────────────────────────────────────────────────────────
// Each user has their own vault file: vault-{userId}.json
// Contents: array of { id, iv, tag, data }

function vaultFilePath(userId) {
  return path.join(app.getPath("userData"), `vault-${userId}.json`);
}

function readVault(userId) {
  try {
    return JSON.parse(fs.readFileSync(vaultFilePath(userId), "utf8"));
  } catch {
    return [];
  }
}

function writeVault(userId, entries) {
  fs.writeFileSync(vaultFilePath(userId), JSON.stringify(entries, null, 2), "utf8");
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

  // Derive vault encryption key from master password — stored in memory only
  const encKey = deriveVaultKey(password, user.salt);

  currentUser    = { id: user.id, username: user.username, isAdmin: user.isAdmin, encKey };
  isAuthenticated = true;
  return { ok: true, isAdmin: user.isAdmin };
});
// Sean end

// Sean start
ipcMain.handle("auth:logout", async () => {
  currentUser     = null;
  isAuthenticated = false;
  win.loadFile("index.html");
  return { ok: true };
});
// Sean end

ipcMain.handle("auth:me", async () => {
  if (!currentUser) return null;
  // Never expose the encryption key to the renderer
  const { encKey: _encKey, ...safe } = currentUser;
  return safe;
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

  const users  = readUsers();
  const target = users.find((u) => u.id === id);

  if (!target)              return { ok: false, error: "User not found." };
  if (target.id === currentUser.id) return { ok: false, error: "You cannot delete your own account." };
  if (target.isAdmin)       return { ok: false, error: "Admin accounts cannot be deleted." };

  writeUsers(users.filter((u) => u.id !== id));
  return { ok: true };
});

// ── Navigation ────────────────────────────────────────────────────────────────
// Allowlist prevents renderers from loading arbitrary files via navigate()

const PAGES = {
  auth:  "index.html",
  vault: "vault.html",
  admin: "admin.html",
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

// ── Vault IPC ─────────────────────────────────────────────────────────────────

ipcMain.handle("vault:get-entries", async () => {
  if (!currentUser) return [];

  const encrypted = readVault(currentUser.id);
  return encrypted.map((env) => {
    try {
      const plain = decryptEntry(env, currentUser.encKey);
      return { ...plain, id: env.id };
    } catch {
      return null; // skip corrupted entries
    }
  }).filter(Boolean);
});

ipcMain.handle("vault:add-entry", async (_event, entry) => {
  if (!currentUser) return { ok: false, error: "Not authenticated." };

  const entries = readVault(currentUser.id);
  const id      = crypto.randomBytes(16).toString("hex");
  const now     = new Date().toISOString();

  entries.push({
    id,
    ...encryptEntry({ ...entry, createdAt: now, updatedAt: now }, currentUser.encKey),
  });

  writeVault(currentUser.id, entries);
  return { ok: true, id };
});

ipcMain.handle("vault:update-entry", async (_event, { id, entry }) => {
  if (!currentUser) return { ok: false, error: "Not authenticated." };

  const entries = readVault(currentUser.id);
  const idx     = entries.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, error: "Entry not found." };

  // Preserve original createdAt
  const existing = decryptEntry(entries[idx], currentUser.encKey);
  const updated  = { ...entry, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };

  entries[idx] = { id, ...encryptEntry(updated, currentUser.encKey) };
  writeVault(currentUser.id, entries);
  return { ok: true };
});

ipcMain.handle("vault:delete-entry", async (_event, id) => {
  if (!currentUser) return { ok: false, error: "Not authenticated." };

  const entries = readVault(currentUser.id);
  if (!entries.some((e) => e.id === id)) return { ok: false, error: "Entry not found." };

  writeVault(currentUser.id, entries.filter((e) => e.id !== id));
  return { ok: true };
});

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
