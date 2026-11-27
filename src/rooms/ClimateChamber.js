import * as THREE from "three";
import BaseRoom from "./BaseRoom";

const ROOM_W = 26;
const ROOM_D = 16;
const WALL_H = 6;
const BACK_Z = -ROOM_D / 2;
const TILE_W = 2.5;

const v = (x, y, z) => new THREE.Vector3(x, y, z);

class ClimateChamber extends BaseRoom {
  constructor(canvasWidth, canvasHeight) {
    super(canvasWidth, canvasHeight);
    this.stoneSurfaces = [];
    this.build();
  }

  build() {
    this.camera.fov = 55;
    this.camera.far = 200;
    this.camera.position.set(0, 13, ROOM_D / 2 + 9);
    this.camera.lookAt(0, 0, -3);
    this.camera.updateProjectionMatrix();

    this.scene.background = new THREE.Color(0x17221e);
    this.scene.add(new THREE.HemisphereLight(0xe4f6e8, 0x493c30, 1.15));
    const sun = new THREE.DirectionalLight(0xfff0cf, 2.2);
    sun.position.set(-7, 15, 8);
    this.scene.add(sun);

    this.warmLight = new THREE.PointLight(0xff9a52, 48, 13);
    this.warmLight.position.set(-2.2, 3.4, -1.5);
    this.scene.add(this.warmLight);

    this.coolLight = new THREE.PointLight(0x6fdcff, 42, 13);
    this.coolLight.position.set(2.2, 3.4, -1.5);
    this.scene.add(this.coolLight);

    this.simulatorLight = new THREE.PointLight(0x9cff73, 24, 10);
    this.simulatorLight.position.set(0, 4.5, BACK_Z + 0.8);
    this.scene.add(this.simulatorLight);

    this.#buildRoom();
    this.#loadStoneTextures();
  }

  #stoneMaterial(width, height, type = "wall") {
    const material = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    this.stoneSurfaces.push({ material, width, height, type });
    return material;
  }

  #plane(width, height, position, rotY = 0, rotX = 0, type = "wall") {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      this.#stoneMaterial(width, height, type),
    );
    mesh.position.copy(position);
    mesh.rotation.set(rotX, rotY, 0);
    this.scene.add(mesh);
    return mesh;
  }

  #box(width, height, depth, position, material) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material,
    );
    mesh.position.copy(position);
    this.scene.add(mesh);
    return mesh;
  }

  #boxMaterial(color, options = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.68,
      ...options,
    });
  }

  #buildRoom() {
    this.#plane(ROOM_W, ROOM_D, v(0, 0, 0), 0, -Math.PI / 2, "floor");
    this.#plane(ROOM_D, WALL_H, v(-ROOM_W / 2, WALL_H / 2, 0), Math.PI / 2);
    this.#plane(ROOM_D, WALL_H, v(ROOM_W / 2, WALL_H / 2, 0), -Math.PI / 2);

    const exitWidth = 3.5;
    const sideWidth = (ROOM_W - exitWidth) / 2;
    this.#plane(
      sideWidth,
      WALL_H,
      v(-(exitWidth + sideWidth) / 2, WALL_H / 2, BACK_Z),
    );
    this.#plane(
      sideWidth,
      WALL_H,
      v((exitWidth + sideWidth) / 2, WALL_H / 2, BACK_Z),
    );
    this.#plane(
      exitWidth,
      WALL_H - 4.2,
      v(0, 4.2 + (WALL_H - 4.2) / 2, BACK_Z),
    );

    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 512;
    labelCanvas.height = 192;
    const context = labelCanvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create a climate chamber label.");
    }
    context.fillStyle = "#182321";
    context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
    context.fillStyle = "#9cff73";
    context.fillRect(0, 0, 12, labelCanvas.height);
    context.fillStyle = "#f4f4e9";
    context.font = "bold 30px sans-serif";
    context.fillText("CLIMATE CONTROL", 34, 72);
    context.font = "24px sans-serif";
    context.fillStyle = "#c5d5cd";
    context.fillText("22.0 C  |  STABLE", 34, 132);

    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    const simulator = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 1.5),
      new THREE.MeshBasicMaterial({ map: labelTexture }),
    );
    simulator.position.set(0, 4.15, BACK_Z + 0.065);
    this.scene.add(simulator);
    this.#box(
      3.55,
      1.78,
      0.22,
      v(0, 4.15, BACK_Z + 0.18),
      this.#boxMaterial(0x263638, { metalness: 0.5, roughness: 0.35 }),
    );

    for (const x of [-2.4, 2.4]) {
      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.12, 32),
        this.#boxMaterial(x < 0 ? 0xf49b53 : 0x64d8f0, { metalness: 0.45 }),
      );
      dial.rotation.x = Math.PI / 2;
      dial.position.set(x, 4.15, BACK_Z + 0.12);
      this.scene.add(dial);
    }

    const ventMaterial = this.#boxMaterial(0x71817d, {
      metalness: 0.55,
      roughness: 0.42,
    });
    for (let i = 0; i < 7; i++) {
      this.#box(0.12, 0.62, 0.08, v(-0.45 + i * 0.15, 5.35, BACK_Z + 0.08), ventMaterial);
    }

    const wood = this.#boxMaterial(0x654229, { roughness: 0.85 });
    const doorFrame = this.#boxMaterial(0x34251a, { roughness: 0.9 });
    this.#box(exitWidth + 0.2, 4.25, 0.16, v(0, 2.1, BACK_Z + 0.18), doorFrame);
    for (let i = 0; i < 7; i++) {
      this.#box(0.43, 4.08, 0.12, v(-1.3 + i * 0.43, 2.05, BACK_Z + 0.28), wood);
    }
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 12),
      this.#boxMaterial(0xc58b36, { metalness: 0.65, roughness: 0.35 }),
    );
    handle.position.set(1, 2, BACK_Z + 0.4);
    this.scene.add(handle);
  }

  #applyStoneTexture(baseTexture, surfaceType) {
    baseTexture.colorSpace = THREE.SRGBColorSpace;
    for (const { material, width, height, type } of this.stoneSurfaces) {
      if (type !== surfaceType) {
        continue;
      }
      const texture = baseTexture.clone();
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      const tileHeight =
        (TILE_W * baseTexture.image.height) / baseTexture.image.width;
      texture.repeat.set(width / TILE_W, height / tileHeight);
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    }
  }

  #loadStoneTextures() {
    const textureLoader = new THREE.TextureLoader();
    Promise.all([
      textureLoader.loadAsync("/textures/Stonewall.png"),
      textureLoader.loadAsync("/textures/Stonewalls2.jpg"),
    ])
      .then(([floorTexture, wallTexture]) => {
        this.#applyStoneTexture(floorTexture, "floor");
        this.#applyStoneTexture(wallTexture, "wall");
      })
      .catch((error) => {
        console.error(
          "Unable to load the Climate Chamber stone textures:",
          error,
        );
        const status = document.getElementById("climate-status");
        if (status) {
          status.textContent =
            "The chamber loaded without its stone textures. Check Stonewall.png and Stonewalls2.jpg.";
        }
      });
  }

  setUpPlayers() {}

  enablePhysics(physicsEngine) {
    this.physicsEngine = physicsEngine;
    this.physicsEngine.addScene(this.scene);
    this.initInteractables();
  }

  animate(time) {
    this.warmLight.intensity = 45 + 4 * Math.sin(time * 1.4);
    this.coolLight.intensity = 39 + 4 * Math.sin(time * 1.1 + Math.PI);
    this.simulatorLight.intensity = 22 + 2 * Math.sin(time * 1.8);
  }
}

export default ClimateChamber;
