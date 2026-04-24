// ── Element refs ─────────────────────────────────────────────────────────────
const signupCard  = document.getElementById("signup-card");
const loginCard   = document.getElementById("login-card");
const modal       = document.getElementById("master-password-modal");

const signupBtn   = document.getElementById("signup-btn");
const loginBtn    = document.getElementById("login-btn");
const modalCancel = document.getElementById("modal-cancel");
const modalConfirm = document.getElementById("modal-confirm");

const signupMessage = document.getElementById("signup-message");
const loginMessage  = document.getElementById("login-message");
const modalMessage  = document.getElementById("modal-message");

// ── Card transitions ──────────────────────────────────────────────────────────
// Sequential fade: out → swap → in (prevents both cards being visible at once)
function switchTo(hide, show) {
  hide.classList.add("fading-out");
  hide.addEventListener(
    "animationend",
    () => {
      hide.classList.remove("fading-out");
      hide.classList.add("hidden");
      show.classList.remove("hidden");
      show.classList.add("fading-in");
      show.addEventListener(
        "animationend",
        () => show.classList.remove("fading-in"),
        { once: true },
      );
    },
    { once: true },
  );
}

document.getElementById("go-to-login").addEventListener("click", () => {
  clearMessage(signupMessage);
  switchTo(signupCard, loginCard);
});

document.getElementById("go-to-signup").addEventListener("click", () => {
  clearMessage(loginMessage);
  switchTo(loginCard, signupCard);
});

// ── Message helpers ───────────────────────────────────────────────────────────
function showMessage(el, text, type /* "error" | "success" */) {
  el.textContent = text;
  el.className = `form-message ${type}`;
}

function clearMessage(el) {
  el.textContent = "";
  el.className = "form-message hidden";
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.style.opacity = loading ? "0.6" : "";
}

// ── Signup — step 1: validate username, open modal ───────────────────────────
signupBtn.addEventListener("click", () => {
  const username = document.getElementById("signup-username").value.trim();
  clearMessage(signupMessage);

  if (!username) {
    showMessage(signupMessage, "Please enter a username.", "error");
    return;
  }

  // Stash username so the modal confirm step can use it
  modal.dataset.username = username;

  // Reset modal state
  document.getElementById("master-password").value = "";
  document.getElementById("master-confirm").value = "";
  clearMessage(modalMessage);

  modal.classList.remove("hidden");
  document.getElementById("master-password").focus();
});

// ── Signup — step 2: confirm master password in modal ────────────────────────
modalConfirm.addEventListener("click", async () => {
  const username   = modal.dataset.username;
  const masterPw   = document.getElementById("master-password").value;
  const confirmPw  = document.getElementById("master-confirm").value;
  clearMessage(modalMessage);

  if (!masterPw) {
    showMessage(modalMessage, "Please enter a master password.", "error");
    return;
  }
  if (masterPw.length < 8) {
    showMessage(modalMessage, "Master password must be at least 8 characters.", "error");
    return;
  }
  if (masterPw !== confirmPw) {
    showMessage(modalMessage, "Passwords do not match.", "error");
    return;
  }

  setLoading(modalConfirm, true);
  const result = await window.api.signup(username, masterPw);
  setLoading(modalConfirm, false);

  if (!result.ok) {
    showMessage(modalMessage, result.error, "error");
    return;
  }

  // Success — close modal, switch to login, show confirmation
  modal.classList.add("hidden");
  switchTo(signupCard, loginCard);
  showMessage(loginMessage, "Account created — sign in to continue.", "success");
});

modalCancel.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Close modal on overlay click (but not on the card itself)
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.add("hidden");
});

// ── Login ─────────────────────────────────────────────────────────────────────
loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  clearMessage(loginMessage);

  if (!username || !password) {
    showMessage(loginMessage, "Please enter your username and password.", "error");
    return;
  }

  setLoading(loginBtn, true);
  const result = await window.api.login(username, password);
  setLoading(loginBtn, false);

  if (!result.ok) {
    showMessage(loginMessage, result.error, "error");
    return;
  }

  window.api.navigate("vault");
});
