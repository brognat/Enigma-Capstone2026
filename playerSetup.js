const setupMenu = document.getElementById("setup-menu");
const setupForm = document.getElementById("setup-form");
const userIdInputs = [
  document.getElementById("user-1-id"),
  document.getElementById("user-2-id"),
];

document.getElementById("start-button").addEventListener("click", () => {
  setupMenu.showModal();
});

document.getElementById("cancel-setup").addEventListener("click", () => {
  setupMenu.close();
});

setupMenu.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    setupMenu.close();
  }
});

userIdInputs.forEach((input) => {
  input.addEventListener("input", () => {
    input.setCustomValidity(
      input.value.trim() ? "" : "Please enter a user ID.",
    );
  });
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  userIdInputs.forEach((input) => {
    input.value = input.value.trim();
    input.setCustomValidity(input.value ? "" : "Please enter a user ID.");
  });
  if (!setupForm.reportValidity()) return;

  window.location.assign("Game.html");
});
