import * as THREE from "three";

export function mountRoomPage(RoomClass, ariaLabel) {
  const root = document.getElementById("game-root");
  if (!root) {
    throw new Error("Unable to start the room: #game-root was not found.");
  }

  const width = Math.max(root.clientWidth, 1);
  const height = Math.max(root.clientHeight, 1);
  const room = new RoomClass(width, height);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", ariaLabel);
  root.prepend(renderer.domElement);

  renderer.setAnimationLoop((time) => {
    room.animate(time / 1000, {});
    renderer.render(room.getScene(), room.getCamera());
  });

  window.addEventListener("resize", () => {
    const nextWidth = Math.max(root.clientWidth, 1);
    const nextHeight = Math.max(root.clientHeight, 1);
    room.onResize(nextWidth, nextHeight);
    renderer.setSize(nextWidth, nextHeight);
  });
}
