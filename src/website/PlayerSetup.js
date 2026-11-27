const setupMenu = document.getElementById("setup-menu");
const setupForm = document.getElementById("setup-form");
const user2Input = document.getElementById("user-2-id");

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

function clearCustomValidity() {
  user2Input.setCustomValidity("");
}

// Clear custom valididty to make sure the validity message doesnt carry on from last submit
user2Input.addEventListener("input", clearCustomValidity);

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(setupForm);
  const user1Id = formData.get("user1Id").trim();
  const user2Id = formData.get("user2Id").trim();
  const aiMode = formData.get("aiMode");

  if (user1Id === user2Id) {
    user2Input.setCustomValidity("User 2 ID must be different from User 1 ID.");
    user2Input.reportValidity();
    return;
  }

  sessionStorage.setItem("user1Id", `"${user1Id}"`);
  sessionStorage.setItem("user2Id", `"${user2Id}"`);
  sessionStorage.setItem("aiMode", aiMode);

  window.location.assign("./src/rooms/Maze.html");
});