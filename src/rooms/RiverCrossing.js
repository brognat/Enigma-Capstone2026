import * as THREE from "three";
import BaseRoom from "./BaseRoom.js";

const ROOM_W = 26;
const ROOM_D = 16;
const STREAM_D = 2;
const WALL_H = 5;
const DOOR_W = 3;
const DOOR_H = 4;
const BACK_Z = -ROOM_D / 2;

class RiverCrossing extends BaseRoom {
  constructor(canvasWidth, canvasHeight) {
    super(canvasWidth, canvasHeight);
    this.streams = [];
    this.waterClock = new THREE.Clock();
    this.build();
  }

  build() {
    this.camera.fov = 55;
    this.camera.far = 200;
    this.camera.position.set(0, 13, ROOM_D / 2 + 9);
    this.camera.lookAt(0, 0, -3);
    this.camera.zoom = 1.1;
    this.camera.updateProjectionMatrix();

    this.scene.add(new THREE.HemisphereLight(0xdceeff, 0x746044, 0.9));
    const sun = new THREE.DirectionalLight(0xffefd1, 2.6);
    sun.position.set(-8, 16, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -18,
      right: 18,
      top: 18,
      bottom: -18,
      near: 0.5,
      far: 60,
    });
    sun.shadow.normalBias = 0.03;
    sun.shadow.bias = -0.0001;
    this.scene.add(sun);

    this.#buildTexturedScene().catch((error) => {
      console.error("Unable to load the outdoor room:", error);
      const status = document.getElementById("scene-status");
      if (status) {
        status.textContent =
          "Unable to load the outdoor room. Check the Three.js connection and Grass.png / Water.png / Stonewall.png files.";
      }
    });
  }

  async #buildTexturedScene() {
    const textureUrl = (fileName) => {
      return new URL(`/textures/${fileName}`, window.location.origin).href;
    };
    const loader = new THREE.TextureLoader();
    const [grassTexture, waterTexture, stoneTexture] = await Promise.all([
      loader.loadAsync(textureUrl("Grass.png")),
      loader.loadAsync(textureUrl("Water.png")),
      loader.loadAsync(textureUrl("Stonewall.png")),
    ]);

    const tiledTexture = (baseTexture, width, height, tileWidth) => {
      const texture = baseTexture.clone();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT =
        baseTexture === grassTexture
          ? THREE.MirroredRepeatWrapping
          : THREE.RepeatWrapping;
      const tileHeight =
        (tileWidth * baseTexture.image.height) / baseTexture.image.width;
      texture.repeat.set(width / tileWidth, height / tileHeight);
      texture.needsUpdate = true;
      return texture;
    };

    const surface = (
      baseTexture,
      depth,
      z,
      tileWidth,
      roughness,
      geometry = new THREE.PlaneGeometry(ROOM_W, depth),
    ) => {
      const texture = tiledTexture(baseTexture, ROOM_W, depth, tileWidth);
      const tileDepth =
        (tileWidth * baseTexture.image.height) / baseTexture.image.width;
      texture.offset.y = (ROOM_D / 2 - z - depth / 2) / tileDepth;
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ map: texture, roughness }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(0, 0, z);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      return mesh;
    };

    const waterTileWidth = 3;
    const waterFlowSpeed = 0.15 * waterTileWidth;
    const shadeWater = (material, flow, phase) => {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.waterDistance = flow;
        shader.uniforms.waterPhase = { value: phase };
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec2 vWaterPosition;",
          )
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             vWaterPosition = position.xy;`,
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            `#include <common>
             varying vec2 vWaterPosition;
             uniform float waterDistance;
             uniform float waterPhase;`,
          )
          .replace(
            "#include <map_fragment>",
            `vec2 flowPosition = vWaterPosition - vec2(waterDistance, 0.0);
             vec2 distortion = vec2(
               sin(3.2 * flowPosition.x + 1.7 * flowPosition.y + waterPhase),
               sin(6.1 * (flowPosition.x - 0.45 * waterDistance)
                 - 4.3 * flowPosition.y - waterPhase)
             );
             vec3 caustics = texture2D(map, vMapUv + 0.036 * distortion).rgb;
             diffuseColor.rgb *= mix(vec3(0.012, 0.095, 0.115), caustics, 0.23);`,
          )
          .replace(
            "#include <opaque_fragment>",
            `vec3 waterView = normalize(vViewPosition);
             vec3 reflected = inverseTransformDirection(reflect(-waterView, normal), viewMatrix);
             float facing = clamp(dot(waterView, normal), 0.0, 1.0);
             float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
             float skyGlint = pow(max(dot(reflected, normalize(vec3(-0.2, 0.65, -1.0))), 0.0), 24.0);
             outgoingLight = mix(outgoingLight, vec3(0.30, 0.57, 0.73), fresnel);
             outgoingLight += vec3(0.37, 0.51, 0.56) * skyGlint * (0.25 + 2.0 * fresnel);
             #include <opaque_fragment>`,
          );
      };
    };

    const stream = (z, direction, phase) => {
      const geometry = new THREE.PlaneGeometry(ROOM_W, STREAM_D, 156, 12);
      const positions = geometry.attributes.position;
      positions.setUsage(THREE.DynamicDrawUsage);
      geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      const mesh = surface(
        waterTexture,
        STREAM_D,
        z,
        waterTileWidth,
        0.22,
        geometry,
      );
      const flow = { value: 0 };
      shadeWater(mesh.material, flow, phase);
      this.streams.push({ mesh, direction, phase, flow, waterTileWidth, waterFlowSpeed });
    };

    surface(grassTexture, 4, -6, 3, 0.95);
    surface(grassTexture, 4, 0, 3, 0.95);
    surface(grassTexture, 4, 6, 3, 0.95);
    stream(-3, 1, 0);
    stream(3, -1, 1.7);

    this.#buildDocks();
    this.#buildBackWall(stoneTexture, tiledTexture);
    const status = document.getElementById("scene-status");
    if (status) {
      status.hidden = true;
    }
  }

  #buildDocks() {
    const woodPixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const grain = Math.round(
          12 * Math.sin(y * 0.65 + 1.5 * Math.sin(x * 0.05)) +
            5 * Math.sin(y * 2.6 + x * 0.08),
        );
        woodPixels.set(
          [145 + grain, 96 + grain, 52 + grain, 255],
          (y * 128 + x) * 4,
        );
      }
    }

    const woodTexture = new THREE.DataTexture(woodPixels, 128, 128);
    woodTexture.colorSpace = THREE.SRGBColorSpace;
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.needsUpdate = true;
    const dockWood = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.9,
    });
    const slatGeometry = new THREE.BoxGeometry(2.4, 0.14, 0.2);
    const supportGeometry = new THREE.BoxGeometry(0.14, 0.16, 1.35);
    const legGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.8, 12);

    for (const streamZ of [-3, 3]) {
      for (const bank of [-1, 1]) {
        const group = new THREE.Group();
        group.name = `dock-${streamZ}-${bank}`;
        group.position.set(0, 0, streamZ + bank * 1.15);
        const addPiece = (geometry, x, y, z) => {
          const mesh = new THREE.Mesh(geometry, dockWood);
          mesh.position.set(x, y, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        };
        for (let i = 0; i < 6; i++) {
          addPiece(slatGeometry, 0, 0.4, (i - 2.5) * 0.23);
        }
        for (const x of [-0.95, 0.95]) {
          addPiece(supportGeometry, x, 0.25, 0);
          for (const z of [-0.5, 0.5]) {
            addPiece(legGeometry, x, -0.07, z);
          }
        }
        this.scene.add(group);
      }
    }
  }

  #buildBackWall(stoneTexture, tiledTexture) {
    const sideWidth = (ROOM_W - DOOR_W) / 2;
    const addWall = (width, height, x, y) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshStandardMaterial({
          map: tiledTexture(stoneTexture, width, height, 2.5),
          roughness: 0.9,
          side: THREE.DoubleSide,
        }),
      );
      mesh.position.set(x, y, BACK_Z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };
    addWall(sideWidth, WALL_H, -(DOOR_W + sideWidth) / 2, WALL_H / 2);
    addWall(sideWidth, WALL_H, (DOOR_W + sideWidth) / 2, WALL_H / 2);
    addWall(DOOR_W, WALL_H - DOOR_H, 0, (WALL_H + DOOR_H) / 2);

    const roofDepth = 4;
    const roofThickness = 0.2;
    const roofAngle = 0.12;
    const roofWidth = ROOM_W + 0.4;
    const roofCenterZ = BACK_Z - roofDepth / 2;
    const roofCenterY =
      WALL_H -
      roofThickness / 2 +
      (roofDepth / 2) * Math.sin(roofAngle);
    const roofMaterial = new THREE.MeshStandardMaterial({
      map: tiledTexture(stoneTexture, roofWidth, roofDepth, 2.5),
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(roofWidth, roofThickness, roofDepth),
      roofMaterial,
    );
    roof.position.set(0, roofCenterY, roofCenterZ);
    roof.rotation.x = roofAngle;
    roof.castShadow = true;
    roof.receiveShadow = true;
    this.scene.add(roof);

    const roofLipHeight = 0.35;
    const roofLipDepth = 0.25;
    const roofLipMaterial = new THREE.MeshStandardMaterial({
      map: tiledTexture(stoneTexture, roofWidth, roofLipHeight, 2.5),
      roughness: 0.9,
    });
    const frontLip = new THREE.Mesh(
      new THREE.BoxGeometry(roofWidth, roofLipHeight, roofLipDepth),
      roofLipMaterial,
    );
    frontLip.position.set(
      0,
      WALL_H + roofLipHeight / 2,
      BACK_Z - roofLipDepth / 2,
    );
    frontLip.castShadow = true;
    frontLip.receiveShadow = true;
    this.scene.add(frontLip);

    for (const x of [
      -roofWidth / 2 + roofLipDepth / 2,
      roofWidth / 2 - roofLipDepth / 2,
    ]) {
      const sideLip = new THREE.Mesh(
        new THREE.BoxGeometry(roofLipDepth, roofLipHeight, roofDepth),
        new THREE.MeshStandardMaterial({
          map: tiledTexture(stoneTexture, roofLipDepth, roofDepth, 2.5),
          roughness: 0.9,
        }),
      );
      sideLip.position.set(
        x,
        roofCenterY + roofThickness / 2 + roofLipHeight / 2,
        roofCenterZ,
      );
      sideLip.rotation.x = roofAngle;
      sideLip.castShadow = true;
      sideLip.receiveShadow = true;
      this.scene.add(sideLip);
    }

    const wood = new THREE.MeshStandardMaterial({
      color: 0x654229,
      roughness: 0.85,
    });
    const frame = new THREE.MeshStandardMaterial({
      color: 0x34251a,
      roughness: 0.9,
    });
    const brass = new THREE.MeshStandardMaterial({
      color: 0xc58b36,
      metalness: 0.65,
      roughness: 0.35,
    });
    const doorPiece = (width, height, depth, x, y, z, material) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        material,
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };
    doorPiece(DOOR_W, DOOR_H, 0.16, 0, DOOR_H / 2, BACK_Z, frame);
    for (let i = 0; i < 6; i++) {
      doorPiece(
        0.48,
        DOOR_H - 0.12,
        0.12,
        -1.25 + i * 0.5,
        DOOR_H / 2,
        BACK_Z + 0.1,
        wood,
      );
    }
    doorPiece(0.2, DOOR_H, 0.3, -DOOR_W / 2, DOOR_H / 2, BACK_Z + 0.1, frame);
    doorPiece(0.2, DOOR_H, 0.3, DOOR_W / 2, DOOR_H / 2, BACK_Z + 0.1, frame);
    doorPiece(
      DOOR_W + 0.2,
      0.2,
      0.3,
      0,
      DOOR_H - 0.1,
      BACK_Z + 0.1,
      frame,
    );
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 8),
      brass,
    );
    handle.position.set(1, 1.8, BACK_Z + 0.25);
    handle.castShadow = true;
    handle.receiveShadow = true;
    this.scene.add(handle);
  }

  setUpPlayers() {}

  enablePhysics(physicsEngine) {
    this.physicsEngine = physicsEngine;
    this.physicsEngine.addScene(this.scene);
    this.initInteractables();
  }

  animate() {
    const waterTime = Math.min(this.waterClock.getDelta(), 0.05);
    this.waterElapsed = (this.waterElapsed || 0) + waterTime;

    for (const { mesh, direction, phase, flow, waterTileWidth, waterFlowSpeed } of this.streams) {
      const distance = direction * waterFlowSpeed * this.waterElapsed;
      flow.value = distance;
      mesh.material.map.offset.x = (-distance / waterTileWidth) % 1;

      const { position, uv } = mesh.geometry.attributes;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const across = uv.getY(i);
        const bankFade = 4 * across * (1 - across);
        const swell = Math.sin(3.2 * (x - distance) + 1.7 * y + phase);
        const ripple = Math.sin(
          6.1 * (x - 1.45 * distance) - 4.3 * y - phase,
        );
        position.setZ(
          i,
          bankFade * bankFade * (0.072 * swell + 0.024 * ripple),
        );
      }
      position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
  }
}

export default RiverCrossing;
