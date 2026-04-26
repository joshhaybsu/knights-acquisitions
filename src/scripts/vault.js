let currentUser = null;
let allEntries  = [];

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  currentUser = await window.api.me();

  // Guard: if session has expired send back to auth
  if (!currentUser) {
    window.api.navigate("auth");
    return;
  }

  document.getElementById("vault-username").textContent = currentUser.username;

  // Show admin button only for admin users
  if (currentUser.isAdmin) {
    document.getElementById("admin-btn").classList.remove("hidden");
  }

  // Reveal add button now that we know who the user is
  document.getElementById("add-entry-btn").classList.remove("hidden");

  await loadEntries();
}

// ── Load & render ─────────────────────────────────────────────────────────────
async function loadEntries() {
  allEntries = await window.api.getEntries();
  renderList(allEntries);
}

function renderList(entries) {
  const list  = document.getElementById("vault-list");
  const empty = document.getElementById("vault-empty");

  // Remove existing entry cards, keep the empty-state div
  list.querySelectorAll(".entry-card").forEach((el) => el.remove());

  if (entries.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  entries.forEach((entry) => list.appendChild(createEntryCard(entry)));
}

function createEntryCard(entry) {
  const card   = document.createElement("div");
  card.className   = "entry-card";
  card.dataset.id  = entry.id;

  const letter = (entry.title || "?")[0].toUpperCase();
  const color  = letterColor(letter);

  card.innerHTML = `
    <div class="entry-icon" style="background:${color}">${escapeHtml(letter)}</div>
    <div class="entry-info">
      <div class="entry-title">${escapeHtml(entry.title)}</div>
      <div class="entry-subtitle">${escapeHtml(entry.username || entry.website || "")}</div>
    </div>
  `;

  // Click handler — placeholder until detail modal is built
  card.addEventListener("click", () => {
    console.log("Entry clicked:", entry.id);
  });

  return card;
}

// ── Search ────────────────────────────────────────────────────────────────────
document.getElementById("vault-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = q
    ? allEntries.filter(
        (en) =>
          en.title?.toLowerCase().includes(q) ||
          en.username?.toLowerCase().includes(q) ||
          en.website?.toLowerCase().includes(q),
      )
    : allEntries;
  renderList(filtered);
});

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById("logout-btn").addEventListener("click", () => {
  window.api.logout();
});

document.getElementById("admin-btn").addEventListener("click", () => {
  window.api.navigate("admin");
});

document.getElementById("add-entry-btn").addEventListener("click", () => {
  // Placeholder until the add modal is built
  console.log("Add entry clicked");
});

// ── Utilities ─────────────────────────────────────────────────────────────────
// Deterministic colour from a letter — keeps icons consistent across sessions
function letterColor(letter) {
  const colors = [
    "#2e5f8a", "#2e7a5f", "#6b4f8a", "#8a4f2e",
    "#2e6b8a", "#5f8a2e", "#8a2e5f", "#4f6b8a",
  ];
  return colors[letter.charCodeAt(0) % colors.length];
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
