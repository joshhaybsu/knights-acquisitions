let currentUser     = null;
let allEntries      = [];
let editingId       = null;   // null = new entry, string id = editing existing
let detailEntry     = null;   // entry currently shown in detail modal
let detailPwVisible = false;

// ── Eye icon helper ───────────────────────────────────────────────────────────
const SVG_EYE_OPEN = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" stroke-width="1.4"/>
  <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/>
</svg>`;

const SVG_EYE_CLOSED = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M2 2l12 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M4.5 4.9C3 5.9 1.8 7 1 8c0 0 2.5 5 7 5 1.2 0 2.3-.3 3.2-.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M8 3c4.5 0 7 5 7 5-.6 1-1.6 2.2-2.9 3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/>
</svg>`;

// isVisible = true means the password is currently showing (so show the closed eye)
function setEyeIcon(btn, isVisible) {
  btn.innerHTML = isVisible ? SVG_EYE_CLOSED : SVG_EYE_OPEN;
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  currentUser = await window.api.me();

  if (!currentUser) {
    window.api.navigate("auth");
    return;
  }

  document.getElementById("vault-username").textContent = currentUser.username;

  if (currentUser.isAdmin) {
    document.getElementById("admin-btn").classList.remove("hidden");
  }

  document.getElementById("add-entry-btn").classList.remove("hidden");

  await loadEntries();
}

// ── Entries ───────────────────────────────────────────────────────────────────
async function loadEntries() {
  allEntries = await window.api.getEntries();
  renderList(allEntries);
}

function renderList(entries) {
  const list  = document.getElementById("vault-list");
  const empty = document.getElementById("vault-empty");

  list.querySelectorAll(".entry-card").forEach((el) => el.remove());

  if (entries.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  entries.forEach((entry) => list.appendChild(createEntryCard(entry)));
}

function createEntryCard(entry) {
  const card  = document.createElement("div");
  card.className  = "entry-card";
  card.dataset.id = entry.id;

  const letter = (entry.title || "?")[0].toUpperCase();
  const color  = letterColor(letter);

  card.innerHTML = `
    <div class="entry-icon" style="background:${color}">${escapeHtml(letter)}</div>
    <div class="entry-info">
      <div class="entry-title">${escapeHtml(entry.title)}</div>
      <div class="entry-subtitle">${escapeHtml(entry.username || entry.website || "")}</div>
    </div>
  `;

  card.addEventListener("click", () => openDetail(entry));
  return card;
}

// ── Search ────────────────────────────────────────────────────────────────────
document.getElementById("vault-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  renderList(
    q
      ? allEntries.filter(
          (en) =>
            en.title?.toLowerCase().includes(q) ||
            en.username?.toLowerCase().includes(q) ||
            en.website?.toLowerCase().includes(q),
        )
      : allEntries,
  );
});

// ── Add / Edit modal ──────────────────────────────────────────────────────────
const entryModal    = document.getElementById("entry-modal");
const entryModalMsg = document.getElementById("entry-modal-message");

function openEntryModal(entry = null) {
  editingId = entry?.id ?? null;
  document.getElementById("entry-modal-title").textContent = entry ? "Edit entry" : "Add entry";
  document.getElementById("entry-title").value    = entry?.title    ?? "";
  document.getElementById("entry-website").value  = entry?.website  ?? "";
  document.getElementById("entry-username").value = entry?.username ?? "";
  document.getElementById("entry-password").value = entry?.password ?? "";
  document.getElementById("entry-notes").value    = entry?.notes    ?? "";

  // Reset password field and eye icon to hidden state on open
  document.getElementById("entry-password").type = "password";
  setEyeIcon(document.getElementById("toggle-entry-password"), false);

  clearMsg(entryModalMsg);
  entryModal.classList.remove("hidden");
  document.getElementById("entry-title").focus();
}

function closeEntryModal() {
  entryModal.classList.add("hidden");
  editingId = null;
}

document.getElementById("add-entry-btn").addEventListener("click", () => openEntryModal());
document.getElementById("entry-modal-cancel").addEventListener("click", closeEntryModal);
entryModal.addEventListener("click", (e) => { if (e.target === entryModal) closeEntryModal(); });

// Enter key submits the entry modal (except from the notes textarea)
["entry-title", "entry-website", "entry-username", "entry-password"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("entry-modal-save").click();
  });
});

// Show / hide password in entry form
document.getElementById("toggle-entry-password").addEventListener("click", () => {
  const input   = document.getElementById("entry-password");
  const visible = input.type === "password";
  input.type    = visible ? "text" : "password";
  setEyeIcon(document.getElementById("toggle-entry-password"), visible);
});

document.getElementById("entry-modal-save").addEventListener("click", async () => {
  const title    = document.getElementById("entry-title").value.trim();
  const website  = document.getElementById("entry-website").value.trim();
  const username = document.getElementById("entry-username").value.trim();
  const password = document.getElementById("entry-password").value;
  const notes    = document.getElementById("entry-notes").value.trim();

  clearMsg(entryModalMsg);

  if (!title)    return showMsg(entryModalMsg, "Title is required.", "error");
  if (!password) return showMsg(entryModalMsg, "Password is required.", "error");

  const saveBtn    = document.getElementById("entry-modal-save");
  saveBtn.disabled = true;

  const entry  = { title, website, username, password, notes };
  const result = editingId
    ? await window.api.updateEntry(editingId, entry)
    : await window.api.addEntry(entry);

  saveBtn.disabled = false;

  if (!result.ok) return showMsg(entryModalMsg, result.error, "error");

  closeEntryModal();
  await loadEntries();
});

// ── Detail modal ──────────────────────────────────────────────────────────────
const detailModal = document.getElementById("detail-modal");

function openDetail(entry) {
  detailEntry     = entry;
  detailPwVisible = false;

  const letter = (entry.title || "?")[0].toUpperCase();
  const iconEl = document.getElementById("detail-icon");
  iconEl.textContent      = letter;
  iconEl.style.background = letterColor(letter);

  document.getElementById("detail-title").textContent = entry.title;

  const websiteEl = document.getElementById("detail-website");
  if (entry.website) {
    websiteEl.textContent   = entry.website;
    websiteEl.href          = entry.website;
    websiteEl.style.display = "";
  } else {
    websiteEl.style.display = "none";
  }

  document.getElementById("detail-username").textContent = entry.username || "—";
  document.getElementById("detail-password").textContent = "••••••••";
  document.getElementById("detail-notes").textContent    = entry.notes    || "—";
  setEyeIcon(document.getElementById("detail-show-hide"), false);

  detailModal.classList.remove("hidden");
}

function closeDetail() {
  detailModal.classList.add("hidden");
  detailEntry     = null;
  detailPwVisible = false;
}

document.getElementById("detail-close").addEventListener("click", closeDetail);
detailModal.addEventListener("click", (e) => { if (e.target === detailModal) closeDetail(); });

// Show / hide password in detail
document.getElementById("detail-show-hide").addEventListener("click", () => {
  detailPwVisible = !detailPwVisible;
  document.getElementById("detail-password").textContent = detailPwVisible
    ? (detailEntry?.password ?? "")
    : "••••••••";
  setEyeIcon(document.getElementById("detail-show-hide"), detailPwVisible);
});

// Copy buttons
detailModal.querySelectorAll(".copy-btn[data-field]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.dataset.field === "password"
      ? detailEntry?.password
      : detailEntry?.username;
    if (value) flashCopy(btn, value);
  });
});

// Edit from detail
document.getElementById("detail-edit").addEventListener("click", () => {
  const entry = detailEntry;
  closeDetail();
  openEntryModal(entry);
});

// Delete from detail
document.getElementById("detail-delete").addEventListener("click", async () => {
  if (!detailEntry) return;
  if (!confirm(`Delete "${detailEntry.title}"? This cannot be undone.`)) return;

  const result = await window.api.deleteEntry(detailEntry.id);
  if (!result.ok) { alert(result.error); return; }

  closeDetail();
  await loadEntries();
});

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", () => window.api.logout());
document.getElementById("admin-btn").addEventListener("click", () => window.api.navigate("admin"));

// ── Utilities ─────────────────────────────────────────────────────────────────
function letterColor(letter) {
  const palette = ["#2e5f8a","#2e7a5f","#6b4f8a","#8a4f2e","#2e6b8a","#5f8a2e","#8a2e5f","#4f6b8a"];
  return palette[letter.charCodeAt(0) % palette.length];
}

function flashCopy(btn, text) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  });
  const orig    = btn.textContent;
  btn.textContent = "Copied!";
  btn.disabled    = true;
  setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 1500);
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className   = `form-message ${type}`;
}

function clearMsg(el) {
  el.textContent = "";
  el.className   = "form-message hidden";
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]),
  );
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
