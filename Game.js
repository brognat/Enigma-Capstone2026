const players = [
  {
    element: document.getElementById("room-player"),
    clip: document.getElementById("room-player-clip"),
    position: { x: 500, depth: 150 },
    controls: new Set(["w", "a", "s", "d"]),
  },
  {
    element: document.getElementById("room-player-two"),
    clip: document.getElementById("room-player-two-clip"),
    position: { x: 558, depth: 150 },
    controls: new Set(["arrowup", "arrowleft", "arrowdown", "arrowright"]),
  },
];
const keys = new Set();
const pointers = new Map();
const DIRECTIONS = new Set(players.flatMap((player) => [...player.controls]));
const SPEED = 175;
const PLAYER_HALF = 18;
const PLAYER_SIZE = 1.5;
const ROOM = { minX: 24, maxX: 976, minDepth: 12, maxDepth: 288, backWall: 300 };
// Hallway spans room x 420–580 and runs from the back wall (depth 300) to depth 500.
const HALLWAY = { minX: 420 + PLAYER_HALF, maxX: 580 - PLAYER_HALF, maxDepth: 488 };
let previousTime = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const chatIsOpen = () => document.querySelector(".robot-chat:not([hidden])") !== null;

function clearInput() {
  keys.clear();
  pointers.clear();
}

function isEditing(target) {
  return target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), dialog, .robot-chat");
}

// Projects floor coordinates onto the oblique room view; deeper means higher and smaller.
function render(player) {
  const { position } = player;
  const x = 46 + position.x + position.depth * 0.45;
  const y = 604 - position.depth * 0.45;
  const scale = (1 - clamp(position.depth / 500, 0, 1) * 0.58) * PLAYER_SIZE;
  player.element.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
  if (position.depth > ROOM.backWall) {
    player.clip.setAttribute("clip-path", "url(#hallway-opening)");
  } else {
    player.clip.removeAttribute("clip-path");
  }
}

function move(position, dx, dDepth) {
  const bounds = position.depth > ROOM.maxDepth ? HALLWAY : ROOM;
  position.x = clamp(position.x + dx, bounds.minX, bounds.maxX);

  const alignedWithHallway = position.x >= HALLWAY.minX && position.x <= HALLWAY.maxX;
  const maxDepth = alignedWithHallway ? HALLWAY.maxDepth : ROOM.maxDepth;
  position.depth = clamp(position.depth + dDepth, ROOM.minDepth, maxDepth);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (!DIRECTIONS.has(key) || event.ctrlKey || event.metaKey || event.altKey ||
      isEditing(event.target) || chatIsOpen()) return;
  event.preventDefault();
  keys.add(key);
});

document.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
document.addEventListener("focusin", clearInput);
window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  clearInput();
  previousTime = null;
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || chatIsOpen()) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, button.dataset.direction);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(type, (event) => pointers.delete(event.pointerId));
  }
  button.addEventListener("contextmenu", (event) => event.preventDefault());
});

function animate(time) {
  const elapsed = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;

  if (chatIsOpen()) clearInput();
  const held = new Set([...keys, ...pointers.values()]);
  for (const [index, player] of players.entries()) {
    const directions = index === 0
      ? { left: "a", right: "d", back: "w", front: "s" }
      : { left: "arrowleft", right: "arrowright", back: "arrowup", front: "arrowdown" };
    const horizontal = Number(held.has(directions.right)) - Number(held.has(directions.left));
    const depth = Number(held.has(directions.back)) - Number(held.has(directions.front));
    const magnitude = Math.hypot(horizontal, depth);

    if (magnitude > 0) {
      const step = SPEED * elapsed / magnitude;
      move(player.position, horizontal * step, depth * step);
      render(player);
    }
  }
  requestAnimationFrame(animate);
}

players.forEach(render);
requestAnimationFrame(animate);
