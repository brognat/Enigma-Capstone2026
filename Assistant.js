const selectedAiMode = sessionStorage.getItem("aiMode");
const greetings = {
  full: "Hi! I'm your A.I. game assistant, here to help you escape!",
  collaborative:
    "Hi! I'm your A.I. collaborator, here to help you and your team escape!",
};
const companions = [
  ...document.querySelectorAll(".robot-face[data-ai-mode]"),
].map((toggle) => ({
  toggle,
  panel: document.querySelector(
    `.robot-chat[data-ai-mode="${toggle.dataset.aiMode}"]`,
  ),
}));

let openCompanion = null;

function setChatOpen(companion, isOpen) {
  companion.panel.hidden = !isOpen;
  companion.toggle.setAttribute("aria-expanded", String(isOpen));
  companion.toggle.setAttribute(
    "aria-label",
    isOpen ? "Close game guide chat" : "Open game guide chat",
  );
  openCompanion = isOpen ? companion : null;

  if (isOpen) {
    companion.panel.focus();
  } else {
    companion.toggle.focus();
  }
}

companions.forEach((companion) => {
  const isSelected = companion.toggle.dataset.aiMode === selectedAiMode;
  companion.toggle.hidden = !isSelected;
  companion.panel.hidden = true;

  if (!isSelected) return;

  companion.panel.querySelector(".robot-chat-message").textContent =
    greetings[selectedAiMode];

  companion.toggle.addEventListener("click", () => {
    setChatOpen(companion, companion.panel.hidden);
  });

  companion.panel
    .querySelector(".robot-chat-close")
    .addEventListener("click", () => {
      setChatOpen(companion, false);
    });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openCompanion) {
    setChatOpen(openCompanion, false);
  }
});
