const signupCard = document.getElementById("signup-card");
const loginCard = document.getElementById("login-card");

// Transition between the two cards by fading out the active one,
// then swapping visibility and fading the new one in.
// Using a sequential approach rather than simultaneous cross-fade
// avoids both cards being visible at the same time during the transition.
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
        () => {
          show.classList.remove("fading-in");
        },
        { once: true },
      );
    },
    { once: true },
  );
}

document.getElementById("go-to-login").addEventListener("click", () => {
  switchTo(signupCard, loginCard);
});

document.getElementById("go-to-signup").addEventListener("click", () => {
  switchTo(loginCard, signupCard);
});

// Sean start

const signupBtn = document.querySelector("#signup-card .login-btn");
const loginBtn = document.querySelector("#login-card .login-btn");

signupBtn.addEventListener("click", async () => {
  const username = document.getElementById("signup-username").value;
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-confirm").value;

  const error = document.getElementById("signup-error");
  error.textContent = "";

  if (!username || !password || !confirm) {
    error.textContent = "Fill in all fields";
    return;
  }

  if (password !== confirm) {
    error.textContent = "Passwords do not match";
    return;
  }

  localStorage.setItem("username", username);
  localStorage.setItem("password", password);

  error.textContent = "Account created";

  switchTo(signupCard, loginCard);
});

loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const error = document.getElementById("login-error");
  error.textContent = "";

  const savedUsername = localStorage.getItem("username");
  const savedPassword = localStorage.getItem("password");

  if (username !== savedUsername || password !== savedPassword) {
    error.textContent = "Invalid login";
    return;
  }

  await window.api.login(username, password);
});

// Sean end
