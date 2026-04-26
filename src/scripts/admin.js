const tbody  = document.getElementById("user-table-body");
const msgEl  = document.getElementById("admin-message");

// ── Helpers ───────────────────────────────────────────────────────────────────
function showMessage(text, type) {
  msgEl.textContent = text;
  msgEl.className = `form-message ${type}`;
}

function clearMessage() {
  msgEl.textContent = "";
  msgEl.className = "form-message hidden";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
async function loadUsers() {
  // Guard: redirect if not admin
  const me = await window.api.me();
  if (!me?.isAdmin) {
    window.api.navigate("vault");
    return;
  }

  const result = await window.api.getUsers();
  if (!result.ok) {
    showMessage(result.error, "error");
    return;
  }

  renderTable(result.users, me.id);
}

function renderTable(users, myId) {
  if (users.length === 0) {
    tbody.innerHTML = `<tr class="table-placeholder"><td colspan="4">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u) => `
    <tr data-id="${u.id}">
      <td class="col-username">${escapeHtml(u.username)}</td>
      <td class="col-role">
        <span class="role-badge ${u.isAdmin ? "role-admin" : "role-user"}">
          ${u.isAdmin ? "Admin" : "User"}
        </span>
      </td>
      <td class="col-date">${formatDate(u.createdAt)}</td>
      <td class="col-action">
        ${u.id === myId
          ? `<span class="self-label">You</span>`
          : u.isAdmin
            ? `<span class="self-label">Protected</span>`
            : `<button class="btn-danger delete-btn" data-id="${u.id}">Delete</button>`
        }
      </td>
    </tr>
  `).join("");

  // Attach delete handlers
  tbody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteUser(btn.dataset.id, users));
  });
}

async function deleteUser(id, users) {
  const user = users.find((u) => u.id === id);
  if (!user) return;
  if (!confirm(`Delete account "${user.username}"? This cannot be undone.`)) return;

  clearMessage();
  const result = await window.api.deleteUser(id);

  if (!result.ok) {
    showMessage(result.error, "error");
    return;
  }

  // Remove the row and re-render from updated list
  const updated = users.filter((u) => u.id !== id);
  const me = await window.api.me();
  renderTable(updated, me.id);
  showMessage(`Account "${user.username}" deleted.`, "success");
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById("back-btn").addEventListener("click", () => {
  window.api.navigate("vault");
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadUsers();
