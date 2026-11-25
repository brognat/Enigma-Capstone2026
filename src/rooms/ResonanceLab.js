import * as THREE from 'three';
import Player from "../game/core/Player";
import PlayerController from "../game/core/PlayerController";
import BaseRoom from "./BaseRoom";

const ROOM_W = 20;
const ROOM_D = 16;
const WALL_H = 5;
const HALL_W = 4;
const HALL_H = 4;
const HALL_LEN = 14;
const TILE_W = 2.5; // world width of one stone texture tile
const BACK_Z = -ROOM_D / 2;

const v = (x, y, z) => new THREE.Vector3(x, y, z);


class ResonanceLab extends BaseRoom {
    constructor(canvasWidth, canvasHeight) {
        super(canvasWidth, canvasHeight);
        this.stoneSurfaces = [];
        this.speakerBodyMaterial = null;
        this.speakerConeMaterial = null;
        this.build();
    }

    build() {
        this.#setUpCameraAndLights();
        this.#setUpFloorAndWalls();
        this.#setUpGlassPane();
        this.#setUpSpeaker();
        this.#setUpSpeakerWire();
        this.#setUpWaveDisplay();
        this.setUpPlayers();
        this.#loadStoneTextures();
    }

    #setUpCameraAndLights() {
        // Fixed camera at the front of the room, tilted slightly downward.
        this.camera.fov = 55;
        this.camera.far = 200;
        this.camera.position.set(0, 11, ROOM_D / 2 + 9);
        this.camera.lookAt(0, 0, -2);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(6, 14, 10);
        this.scene.add(sun);
        for (const x of [-2.75, 2.75]) {
            const roomLight = new THREE.PointLight(0xffdfb5, 32, 9);
            roomLight.position.set(x, 3.6, 0);
            this.scene.add(roomLight);
        }
        const hallLight = new THREE.PointLight(0xffcc88, 30, 20);
        hallLight.position.set(0, 3, BACK_Z - HALL_LEN + 2);
        this.scene.add(hallLight);
    }

    #setUpFloorAndWalls() {
        // Room floor and walls (front wall omitted so the camera can see in).
        this.#plane(ROOM_W, ROOM_D, v(0, 0, 0), 0, -Math.PI / 2, "floor");
        this.#plane(ROOM_D, WALL_H, v(-ROOM_W / 2, WALL_H / 2, 0), Math.PI / 2);
        this.#plane(ROOM_D, WALL_H, v(ROOM_W / 2, WALL_H / 2, 0), -Math.PI / 2);

        // Back wall split around the hallway opening.
        const sideW = (ROOM_W - HALL_W) / 2;
        this.#plane(sideW, WALL_H, v(-(HALL_W / 2 + sideW / 2), WALL_H / 2, BACK_Z));
        this.#plane(sideW, WALL_H, v(HALL_W / 2 + sideW / 2, WALL_H / 2, BACK_Z));
        this.#plane(HALL_W, WALL_H - HALL_H, v(0, HALL_H + (WALL_H - HALL_H) / 2, BACK_Z));

        // The hallway has no ceiling so the camera can see inside.
        const hallMidZ = BACK_Z - HALL_LEN / 2;
        this.#plane(HALL_W, HALL_LEN, v(0, 0, hallMidZ), 0, -Math.PI / 2, "floor");
        this.#plane(HALL_LEN, HALL_H, v(-HALL_W / 2, HALL_H / 2, hallMidZ), Math.PI / 2);
        this.#plane(HALL_LEN, HALL_H, v(HALL_W / 2, HALL_H / 2, hallMidZ), -Math.PI / 2);
        this.#plane(HALL_W, HALL_H, v(0, HALL_H / 2, BACK_Z - HALL_LEN));
    }

    #setUpGlassPane() {
        const glassMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xa8eaff,
            transparent: true,
            opacity: 0.24,
            roughness: 0.08,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const glassPane = new THREE.Mesh(
            new THREE.PlaneGeometry(HALL_W, HALL_H),
            glassMaterial,
        );
        glassPane.position.set(0, HALL_H / 2, BACK_Z - 0.12);
        this.scene.add(glassPane);
    }

    #setUpSpeaker() {
        this.speakerBodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x252a30,
            metalness: 0.55,
            roughness: 0.4,
        });
        this.speakerConeMaterial = new THREE.MeshStandardMaterial({
            color: 0x68717a,
            metalness: 0.25,
            roughness: 0.65,
            side: THREE.DoubleSide,
        });
        const speakerBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.3, 1.8),
            this.speakerBodyMaterial,
        );
        speakerBody.position.set(0, 0.15, 0);
        this.scene.add(speakerBody);

        this.speakerCone = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.68, 0.2, 48, 1, true),
            this.speakerConeMaterial,
        );
        this.speakerCone.position.set(0, 0.39, 0);
        this.scene.add(this.speakerCone);

        this.speakerCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.17, 24, 12),
            this.speakerBodyMaterial,
        );
        this.speakerCap.scale.y = 0.45;
        this.speakerCap.position.set(0, 0.49, 0);
        this.scene.add(this.speakerCap);

        const speakerRim = new THREE.Mesh(
            new THREE.TorusGeometry(0.7, 0.045, 12, 48),
            this.speakerBodyMaterial,
        );
        speakerRim.rotation.x = Math.PI / 2;
        speakerRim.position.set(0, 0.3, 0);
        this.scene.add(speakerRim);
    }

    #setUpSpeakerWire() {
        this.#addSpeakerWire(
            [
                [-0.38, 0.24, -0.08],
                [-0.65, 0.07, -0.8],
                [-2.4, 0.06, -2.3],
                [-4.3, 0.06, -4.5],
                [-5.8, 0.06, -6.7],
                [-6, 0.06, -7.35],
                [-6, 0.82, BACK_Z + 0.08],
            ],
            0x55e6ff,
        );
        this.#addSpeakerWire(
            [
                [0.38, 0.24, -0.08],
                [0.65, 0.07, -0.8],
                [2.4, 0.06, -2.3],
                [4.3, 0.06, -4.5],
                [5.8, 0.06, -6.7],
                [6, 0.06, -7.35],
                [6, 0.82, BACK_Z + 0.08],
            ],
            0xffc66d,
        );
    }

    #setUpWaveDisplay() {
        this.#addWaveDisplay(-6, "FREQUENCY", "440 Hz", "#55e6ff", 70);
        this.#addWaveDisplay(6, "AMPLITUDE", "70%", "#ffc66d", 125);
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

    #plane(w, h, pos, rotY = 0, rotX = 0, type = "wall") {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            this.#stoneMaterial(w, h, type),
        );
        mesh.position.copy(pos);
        mesh.rotation.set(rotX, rotY, 0);
        this.scene.add(mesh);
    }

    #addSpeakerWire(points, color) {
        const path = new THREE.CatmullRomCurve3(
            points.map(([x, y, z]) => v(x, y, z)),
        );
        const wire = new THREE.Mesh(
            new THREE.TubeGeometry(path, 72, 0.025, 8, false),
            new THREE.MeshStandardMaterial({
                color,
                metalness: 0.2,
                roughness: 0.55,
            }),
        );
        this.scene.add(wire);
    }

    #addWaveDisplay(x, title, reading, color, amplitude) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Unable to create a waveform display.");

        context.fillStyle = "#06101a";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = color;
        context.font = "bold 25px monospace";
        context.fillText(title, 32, 54);
        context.font = "bold 34px monospace";
        context.fillText(reading, 32, 112);

        const left = 32,
            right = 480,
            top = 155,
            bottom = 468;
        context.strokeStyle = "rgba(110, 180, 210, 0.2)";
        context.lineWidth = 1;
        for (let gridX = left; gridX <= right; gridX += 56) {
            context.beginPath();
            context.moveTo(gridX, top);
            context.lineTo(gridX, bottom);
            context.stroke();
        }
        for (let gridY = top; gridY <= bottom; gridY += 52) {
            context.beginPath();
            context.moveTo(left, gridY);
            context.lineTo(right, gridY);
            context.stroke();
        }

        context.beginPath();
        for (let i = 0; i <= 160; i++) {
            const progress = i / 160;
            const px = left + progress * (right - left);
            const py =
                (top + bottom) / 2 - Math.sin(progress * Math.PI * 8) * amplitude;
            if (i === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
        }
        context.strokeStyle = color;
        context.lineWidth = 5;
        context.shadowColor = color;
        context.shadowBlur = 12;
        context.stroke();
        context.shadowBlur = 0;

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(1.6, 1.6),
            new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
        );
        screen.position.set(x, 1.6, BACK_Z + 0.01);
        this.scene.add(screen);

        const knobX = x + 1.15;
        const knobPlate = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.7, 0.08),
            this.speakerBodyMaterial,
        );
        knobPlate.position.set(knobX, 1.6, BACK_Z + 0.05);
        this.scene.add(knobPlate);

        const knob = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.15, 32),
            this.speakerConeMaterial,
        );
        knob.rotation.x = Math.PI / 2;
        knob.position.set(knobX, 1.6, BACK_Z + 0.16);
        this.scene.add(knob);

        const indicator = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.12, 0.01),
            new THREE.MeshBasicMaterial({ color }),
        );
        indicator.position.set(knobX, 1.68, BACK_Z + 0.24);
        this.scene.add(indicator);
    }

    #applyStoneTexture(baseTex, surfaceType) {
        baseTex.colorSpace = THREE.SRGBColorSpace;
        for (const { material, width, height, type } of this.stoneSurfaces) {
            if (type !== surfaceType) continue;
            const tex = baseTex.clone();
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            const tileHeight =
                (TILE_W * baseTex.image.height) / baseTex.image.width;
            tex.repeat.set(width / TILE_W, height / tileHeight);
            material.map = tex;
            material.color.set(0xffffff);
            material.needsUpdate = true;
        }
    }

    #loadStoneTextures() {
        const stoneLoader = new THREE.TextureLoader();
        Promise.all([
            stoneLoader.loadAsync("/textures/Stonewall.png"),
            stoneLoader.loadAsync("/textures/Stonewalls2.jpg"),
        ])
            .then(([stonewall, stonewalls2]) => {
                this.#applyStoneTexture(stonewall, "floor");
                this.#applyStoneTexture(stonewalls2, "wall");
            })
            .catch((error) => {
                console.error(
                    "Unable to load the Sound Shatter stone textures:",
                    error,
                );
            });
    }

    setUpPlayers() {
        const geometry = new THREE.CapsuleGeometry(0.3, 1, 8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });

        const mesh1 = new THREE.Mesh(geometry, material);
        mesh1.castShadow = true;
        mesh1.position.set(0, 0.8, 0);
        this.scene.add(mesh1);

        const mesh2 = new THREE.Mesh(geometry, material);
        mesh2.castShadow = true;
        mesh2.position.set(1, 0.8, 0);
        this.scene.add(mesh2);

        this.setPlayer1(new Player(mesh1, "player1"));
        this.setPlayer2(new Player(mesh2, "player2"));
    }

    enablePhysics(physicsEngine) {
        this.physicsEngine = physicsEngine;
        this.physicsEngine.addScene(this.scene);

        this.controller = new PlayerController(this.physicsEngine);
        this.controller.acticateImpulsesToDynamicBodies(3);

        this.initInteractables();
    }

    animate(time, inputs) {
        const coneScale = 1 + 0.22 * Math.sin(time * 0.2);
        this.speakerCone.scale.y = coneScale;
        this.speakerCone.position.y = 0.29 + 0.1 * coneScale;
        this.speakerCap.position.y = 0.29 + 0.2 * coneScale;
    }
}

export default ResonanceLab;