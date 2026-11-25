import * as THREE from 'three';
import Player from "../game/core/Player";
import PlayerController from "../game/core/PlayerController";
import BaseRoom from "./BaseRoom";

const ROOM_W = 26, ROOM_D = 16, WALL_H = 6;
const TILE_W = 2.5, FLOOR_TILE_H = 1.5;
const BACK_Z = -ROOM_D / 2;
const RAIL_Y = 4, RAIL_Z = -3.5;

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });
const steel = mat(0x8a9099, { metalness: 0.6, roughness: 0.4 });
const darkSteel = mat(0x30343a, { metalness: 0.5, roughness: 0.5 });
const concrete = mat(0xb4b0a6, { roughness: 0.9 });
const black = mat(0x111111);

class DemolitionLab extends BaseRoom {
    constructor(canvasWidth, canvasHeight) {
        super(canvasWidth, canvasHeight);
        // Each stone surface gets its own texture clone so the tile keeps its size.
        this.stoneSurfaces = [];
        this.build();
    }

    build() {
        this.#setUpCameraAndLights();
        this.#setUpStructure();
        this.#setUpRoomObjects();
        this.#setUpExit();
        this.setUpPlayers();
        this.#loadStoneTextures();
    }

    #setUpCameraAndLights() {
        // Same fixed, raised camera as the maze and outdoor rooms.
        this.camera.fov = 55;
        this.camera.far = 200;
        this.camera.position.set(0, 13, ROOM_D / 2 + 9);
        this.camera.lookAt(0, 0, -3);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(-6, 14, 10);
        sun.castShadow = true;
        Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 0.5, far: 60 });
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);
    }

    #setUpStructure() {
        // Room floor and walls (front wall omitted so the camera can see in).
        this.#plane(ROOM_W, ROOM_D, v(0, 0, 0), 0, -Math.PI / 2, this.#stoneMaterial(ROOM_W, ROOM_D, "floor"));
        this.#plane(ROOM_W, WALL_H, v(0, WALL_H / 2, BACK_Z));
        this.#plane(ROOM_D, WALL_H, v(-ROOM_W / 2, WALL_H / 2, 0), Math.PI / 2);
        this.#plane(ROOM_D, WALL_H, v(ROOM_W / 2, WALL_H / 2, 0), -Math.PI / 2);
    }

    #setUpRoomObjects() {
        // Rail: a single beam spanning the room, with mounting blocks on each side wall.
        this.#box(ROOM_W, 0.3, 0.3, v(0, RAIL_Y, RAIL_Z), darkSteel);
        for (const x of [-ROOM_W / 2 + 0.3, ROOM_W / 2 - 0.3]) {
            this.#box(0.4, 0.5, 0.6, v(x, RAIL_Y, RAIL_Z), steel);
        }

        // Crane: a small body riding on the single rail, with a hoist, brown rope and wrecking ball.
        const CRANE_X = -1;
        const craneZ = RAIL_Z;
        this.#box(1.6, 0.9, 1.1, v(CRANE_X, RAIL_Y + 0.6, craneZ), mat(0xf2f2f2));
        for (const dx of [-0.55, 0.55]) {
            const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), black);
            wheel.position.set(CRANE_X + dx, RAIL_Y + 0.1, craneZ);
            wheel.castShadow = true;
            this.scene.add(wheel);
        }
        this.#box(0.6, 0.8, 0.6, v(CRANE_X, RAIL_Y - 0.55, craneZ), mat(0xe6e6e6));

        const CABLE_TOP = RAIL_Y - 0.95, BALL_R = 0.5, BALL_Y = 1.2;
        const cableLen = CABLE_TOP - (BALL_Y + BALL_R);
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, cableLen, 8), mat(0x8b5a2b, { roughness: 1 }));
        cable.position.set(CRANE_X, CABLE_TOP - cableLen / 2, craneZ);
        cable.castShadow = true;
        this.scene.add(cable);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 24), mat(0x2a2a2e, { metalness: 0.7, roughness: 0.35 }));
        ball.position.set(CRANE_X, BALL_Y, craneZ);
        ball.castShadow = true;
        this.scene.add(ball);

        // Crane controller: a small console on legs with a blue screen, next to the crane.
        const CTRL_X = -5.5, CTRL_Z = 0.5;
        this.#box(1.1, 0.6, 0.7, v(CTRL_X, 1.1, CTRL_Z), mat(0xdcdcdc));
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.6 }));
        screen.rotation.x = -Math.PI / 2;
        screen.position.set(CTRL_X, 1.41, CTRL_Z);
        this.scene.add(screen);
        for (const dx of [-0.4, 0.4]) {
            for (const dz of [-0.25, 0.25]) {
                this.#box(0.08, 0.8, 0.08, v(CTRL_X + dx, 0.4, CTRL_Z + dz), darkSteel);
            }
        }

        // Ledge on the left: a slab on legs with a small step.
        const LEDGE_X = -9.5, LEDGE_Z = 3.5, LEDGE_Y = 1.6;
        const metalPixels = new Uint8Array(128 * 128 * 4);
        for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
                const shade = 170 + Math.round(20 * Math.sin(y * 2.4) + 5 * Math.sin(x * 0.3 + y * 5.1));
                const offset = (y * 128 + x) * 4;
                metalPixels.set([shade, shade, shade, 255], offset);
            }
        }
        const brushedTexture = new THREE.DataTexture(metalPixels, 128, 128);
        brushedTexture.colorSpace = THREE.SRGBColorSpace;
        brushedTexture.wrapS = brushedTexture.wrapT = THREE.RepeatWrapping;
        brushedTexture.repeat.set(3, 3);
        brushedTexture.needsUpdate = true;
        const brushedMetal = mat(0xd2d8df, {
            map: brushedTexture,
            bumpMap: brushedTexture,
            bumpScale: 0.015,
            metalness: 0.65,
            roughness: 0.4,
        });
        this.#box(6, 0.3, 4, v(LEDGE_X, LEDGE_Y, LEDGE_Z), brushedMetal);
        this.#box(6, 0.25, 0.3, v(LEDGE_X, LEDGE_Y + 0.27, LEDGE_Z - 1.85), brushedMetal);
        for (const dx of [-2.7, 2.7]) {
            for (const dz of [-1.7, 1.7]) {
                this.#box(0.3, LEDGE_Y, 0.3, v(LEDGE_X + dx, LEDGE_Y / 2, LEDGE_Z + dz), steel);
            }
        }
        this.#box(1.4, 0.4, 1.4, v(LEDGE_X + 4.2, 0.2, LEDGE_Z), concrete);

        // Materials table: a placeholder tray of different materials to choose from.
        const TABLE_X = 5, TABLE_Z = 3.5;
        this.#box(5, 0.2, 2, v(TABLE_X, 1, TABLE_Z), mat(0x7a5230));
        for (const dx of [-2.3, 2.3]) {
            for (const dz of [-0.8, 0.8]) {
                this.#box(0.2, 1, 0.2, v(TABLE_X + dx, 0.5, TABLE_Z + dz), mat(0x5a3b20));
            }
        }
        const materials = [
            mat(0xc58b4a), // wood
            mat(0xa0a7b0, { metalness: 0.7, roughness: 0.3 }), // metal
            mat(0x9a9a9a, { roughness: 1 }), // stone
            mat(0x9fd8ee, { transparent: true, opacity: 0.6, roughness: 0.1 }), // glass
        ];
        const materialNames = ["Wood", "Metal", "Stone", "Glass"];
        materials.forEach((material, i) => {
            const x = TABLE_X - 1.8 + i * 1.2;
            this.#box(0.8, 0.8, 0.8, v(x, 1.5, TABLE_Z), material);

            const labelCanvas = document.createElement("canvas");
            labelCanvas.width = 256;
            labelCanvas.height = 72;
            const context = labelCanvas.getContext("2d");
            context.fillStyle = "rgba(25, 30, 36, 0.9)";
            context.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
            context.fillStyle = "#ffffff";
            context.font = "bold 38px sans-serif";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText(materialNames[i], labelCanvas.width / 2, labelCanvas.height / 2);

            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            labelTexture.colorSpace = THREE.SRGBColorSpace;
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(0.68, 0.19),
                new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true, depthWrite: false }),
            );
            label.position.set(x, 1.5, TABLE_Z + 0.411);
            this.scene.add(label);
        });
    }

    #setUpExit() {
        // Exit: a raised, open-topped enclosure on the right behind a breakable red wall.
        const EX_X0 = 6, EX_X1 = ROOM_W / 2, EX_Z0 = BACK_Z, EX_Z1 = -1.5, EX_H = 2.4;
        const exW = EX_X1 - EX_X0, exD = EX_Z1 - EX_Z0, exCx = (EX_X0 + EX_X1) / 2, exCz = (EX_Z0 + EX_Z1) / 2;
        this.#box(exW, 0.4, exD, v(exCx, 0.2, exCz), this.#stoneMaterial(exW, exD, "floor"));
        this.#box(exW, 1.2, 0.3, v(exCx, 1, EX_Z1), this.#stoneMaterial(exW, 1.2)); // front wall, kept low so the exit door stays visible
        this.#box(0.3, EX_H, exD, v(EX_X0, EX_H / 2 + 0.4, exCz), mat(0xd9444a, { transparent: true, opacity: 0.85 }));
        this.#box(0.5, EX_H + 0.2, exD + 0.2, v(EX_X0 - 0.05, EX_H / 2 + 0.4, exCz), mat(0x8c1d22, { transparent: true, opacity: 0.35 }));

        const door = this.#box(1.6, 2.2, 0.15, v(exCx + 1.5, 0.4 + 1.1, EX_Z0 + 0.1), mat(0x654229));
        door.castShadow = false;
        const doorFrame = this.#box(1.9, 2.5, 0.1, v(exCx + 1.5, 0.4 + 1.25, EX_Z0 + 0.05), mat(0x34251a));
        doorFrame.castShadow = false;
        this.#box(0.12, 0.12, 0.1, v(exCx + 2.1, 0.4 + 1.1, EX_Z0 + 0.22), mat(0xc58b36, { metalness: 0.65, roughness: 0.35 }));
    }

    #stoneMaterial(width, height, type = "wall") {
        const material = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, side: THREE.DoubleSide });
        this.stoneSurfaces.push({ material, width, height, type });
        return material;
    }

    #plane(w, h, pos, rotY = 0, rotX = 0, material = this.#stoneMaterial(w, h)) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        mesh.position.copy(pos);
        mesh.rotation.set(rotX, rotY, 0);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }

    #box(w, h, d, pos, material) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.copy(pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }

    #applyStoneTexture(baseTex, surfaceType, tileHeight) {
        baseTex.colorSpace = THREE.SRGBColorSpace;
        for (const { material, width, height, type } of this.stoneSurfaces) {
            if (type !== surfaceType) continue;
            const tex = baseTex.clone();
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(width / TILE_W, height / tileHeight);
            material.map = tex;
            material.color.set(0xffffff);
            material.needsUpdate = true;
        }
    }

    #loadStoneTextures() {
        const stoneLoader = new THREE.TextureLoader();
        stoneLoader.load("/textures/Stonewall.png", (texture) => {
            this.#applyStoneTexture(texture, "floor", FLOOR_TILE_H);
        }, undefined, (error) => console.error("Unable to load the crane room floor texture.", error));
        stoneLoader.load("/textures/Stonewalls2.jpg", (texture) => {
            const tileHeight = TILE_W * texture.image.height / texture.image.width;
            this.#applyStoneTexture(texture, "wall", tileHeight);
        }, undefined, (error) => console.error("Unable to load the crane room wall texture.", error));
    }

    setUpPlayers() {
        // TODO need to set up player spawn for this room
        // Note since its not implemented it throws a bug in GameLoop
        return;
    }

    enablePhysics(physicsEngine) {
        this.physicsEngine = physicsEngine;
        this.physicsEngine.addScene(this.scene);

        this.controller = new PlayerController(this.physicsEngine);
        this.controller.acticateImpulsesToDynamicBodies(3);

        // Make all intercatble objects that were waiting on the physics engine interactable
        this.initInteractables();
    }

    animate(deltaTime, inputs) {
        return;
    }
}

export default DemolitionLab;