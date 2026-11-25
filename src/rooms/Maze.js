import * as THREE from 'three';
import Player from '../game/core/Player';
import PlayerController from '../game/core/PlayerController';
import BaseRoom from "./BaseRoom";

const ROOM_W = 20, ROOM_D = 16, WALL_H = 5;
const INNER_H = 2.5; // maze walls are lower than the outer walls so the camera can see the paths
const HALL_W = 4, HALL_H = 4, HALL_LEN = 8;
const CELL = 2; // world size of one maze grid cell
const TILE_W = 2.5; // world width of one stone texture tile
const BACK_Z = -ROOM_D / 2;

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// Maze walls as segments on a grid (gx, gz) grid coords -> world x = -ROOM_W/2 + gx*CELL, z = BACK_Z + gz*CELL
// gz 0 is the back wall, gz 8 is the open front edge
const gridX = (gx) => -ROOM_W / 2 + gx * CELL;
const gridZ = (gz) => BACK_Z + gz * CELL;

class Maze extends BaseRoom {
    constructor(canvasWidth, canvasHeight) {
        super(canvasWidth, canvasHeight);
        // Keep track of each stone surface so floors and walls can use different textures.
        this.stoneSurfaces = [];
        this.build();
    }

    build() {
        this.#setUpCameraAndLights();
        this.#setUpStructure();
        this.#setUpExitsAndHallways();
        this.#setUpMazeWalls();
        this.setUpPlayers();
        this.#loadStoneTextures();
    }

    #setUpCameraAndLights() {
        // Override BaseRoom default camera angle
        // Fixed camera at the front of the room, raised and tilted downward to overlook the maze.
        this.camera.fov = 55;
        this.camera.far = 200;
        this.camera.position.set(0, 13, ROOM_D / 2 + 9);
        this.camera.lookAt(0, 0, -3);
        this.camera.updateProjectionMatrix();

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));

        const sun = new THREE.DirectionalLight(0xffffff, 1.2);
        sun.position.set(6, 14, 10);
        sun.castShadow = true;
        Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -25 });
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);
    }

    #setUpStructure() {
        // Room floor and side walls (front wall omitted so the camera can see in).
        this.#plane(ROOM_W, ROOM_D, v(0, 0, 0), 0, -Math.PI / 2, false, this.#stoneMaterial(ROOM_W, ROOM_D, "floor"));
        this.#plane(ROOM_D, WALL_H, v(-ROOM_W / 2, WALL_H / 2, 0), Math.PI / 2);
        this.#plane(ROOM_D, WALL_H, v(ROOM_W / 2, WALL_H / 2, 0), -Math.PI / 2);
    }

    #setUpExitsAndHallways() {
        // Four exits in the back wall; each hallway gets its own light color.
        const gapW = (ROOM_W - 4 * HALL_W) / 5;
        const exits = [
            { x: -ROOM_W / 2 + gapW + HALL_W / 2, color: 0xff3344 },
            { x: -ROOM_W / 2 + gapW * 2 + HALL_W * 1.5, color: 0xffc928 },
            { x: -ROOM_W / 2 + gapW * 3 + HALL_W * 2.5, color: 0x20d8ff },
            { x: -ROOM_W / 2 + gapW * 4 + HALL_W * 3.5, color: 0xc13cff },
        ];

        // Back wall sections between the exits and along both sides, plus the lintel above each opening.
        for (let i = 0; i <= exits.length; i++) {
            const gapX = -ROOM_W / 2 + gapW / 2 + i * (HALL_W + gapW);
            this.#plane(gapW, WALL_H, v(gapX, WALL_H / 2, BACK_Z));
        }

        // Hallways: floor, side walls, back wall
        const hallMidZ = BACK_Z - HALL_LEN / 2;
        const hallBackZ = BACK_Z - HALL_LEN;

        for (const { x, color } of exits) {
            this.#plane(HALL_W, WALL_H - HALL_H, v(x, HALL_H + (WALL_H - HALL_H) / 2, BACK_Z));
            this.#plane(HALL_W, HALL_LEN, v(x, 0, hallMidZ), 0, -Math.PI / 2, false, this.#stoneMaterial(HALL_W, HALL_LEN, "floor"));
            this.#plane(HALL_LEN, HALL_H, v(x - HALL_W / 2, HALL_H / 2, hallMidZ), Math.PI / 2);
            this.#plane(HALL_LEN, HALL_H, v(x + HALL_W / 2, HALL_H / 2, hallMidZ), -Math.PI / 2);
            this.#plane(HALL_W, HALL_H, v(x, HALL_H / 2, hallBackZ));
            this.#addHallDoor(x, hallBackZ);

            const hallLight = new THREE.PointLight(color, 30, 20);
            hallLight.position.set(x, 3, BACK_Z - HALL_LEN + 2);
            this.scene.add(hallLight);
        }
    }

    #applyStoneTexture(baseTex, surfaceType) {
        baseTex.colorSpace = THREE.SRGBColorSpace;
        this.stoneSurfaces.forEach(({ material, width, height, type }) => {
            if (type !== surfaceType) return;
            const tex = baseTex.clone();
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            const tileHeight = TILE_W * baseTex.image.height / baseTex.image.width;
            tex.repeat.set(width / TILE_W, height / tileHeight);
            material.map = tex;
            material.color.set(0xffffff);
            material.needsUpdate = true;
        });
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
                console.error("Unable to load the maze room stone textures.", error);
            });
    }

    #stoneMaterial(width, height, type = "wall") {
        const material = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9, side: THREE.DoubleSide });
        this.stoneSurfaces.push({ material, width, height, type });
        return material;
    }

    #plane(w, h, pos, rotY = 0, rotX = 0, castShadow = false, material = this.#stoneMaterial(w, h)) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
        mesh.position.copy(pos);
        mesh.rotation.set(rotX, rotY, 0);
        mesh.receiveShadow = true;
        mesh.castShadow = castShadow;
        this.scene.add(mesh);
    }

    #doorPiece(width, height, depth, x, y, z, material) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    #addHallDoor(x, z) {
        const doorWidth = 3;
        const doorHeight = HALL_H;
        const wood = new THREE.MeshStandardMaterial({ color: 0x654229, roughness: 0.85 });
        const frame = new THREE.MeshStandardMaterial({ color: 0x34251a, roughness: 0.9 });
        const brass = new THREE.MeshStandardMaterial({ color: 0xc58b36, metalness: 0.65, roughness: 0.35 });

        this.#doorPiece(doorWidth, doorHeight, 0.16, x, doorHeight / 2, z, frame);
        for (let i = 0; i < 6; i++) {
            this.#doorPiece(0.48, doorHeight - 0.12, 0.12, x - 1.25 + i * 0.5, doorHeight / 2, z + 0.1, wood);
        }
        this.#doorPiece(0.2, doorHeight, 0.3, x - doorWidth / 2, doorHeight / 2, z + 0.1, frame);
        this.#doorPiece(0.2, doorHeight, 0.3, x + doorWidth / 2, doorHeight / 2, z + 0.1, frame);
        this.#doorPiece(doorWidth + 0.2, 0.2, 0.3, x, doorHeight - 0.1, z + 0.1, frame);
        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 8), brass);
        handle.position.set(x + 1, 1.8, z + 0.25);
        handle.castShadow = true;
        handle.receiveShadow = true;
        this.scene.add(handle);
    }

    #mazeWall(gx1, gz1, gx2, gz2) {
        const x1 = gridX(gx1), z1 = gridZ(gz1), x2 = gridX(gx2), z2 = gridZ(gz2);
        const alongX = z1 === z2;
        const len = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
        this.#plane(len, INNER_H, v((x1 + x2) / 2, INNER_H / 2, (z1 + z2) / 2), alongX ? 0 : Math.PI / 2, 0, true, this.#stoneMaterial(len, INNER_H));
    }

    #setUpMazeWalls() {
        // Walls running left-to-right
        this.#mazeWall(1, 2, 4, 2);
        this.#mazeWall(6, 2, 9, 2);
        this.#mazeWall(0, 4, 3, 4);
        this.#mazeWall(5, 4, 7, 4);
        this.#mazeWall(2, 6, 5, 6);
        this.#mazeWall(7, 6, 10, 6);

        // Walls running front-to-back
        this.#mazeWall(3, 2, 3, 4);
        this.#mazeWall(4, 0, 4, 1);
        this.#mazeWall(6, 0, 6, 1);
        this.#mazeWall(7, 2, 7, 4);
        this.#mazeWall(5, 4, 5, 6);
        this.#mazeWall(8, 4, 8, 6);
        this.#mazeWall(1, 6, 1, 8);
        this.#mazeWall(6, 6, 6, 8);

    }

    setUpPlayers() {
        // TODO need to set up player spawn for this room
        // Note since its not inplemnted it thorws a bug in GameLoop
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

export default Maze;