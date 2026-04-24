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
