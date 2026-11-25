// rooms/Testing.js
import * as THREE from 'three';
import BaseRoom from './BaseRoom.js';
import PlayerController from '../game/core/PlayerController.js';
import Player from '../game/core/Player.js';

class Testing extends BaseRoom {
    constructor(canvasWidth, canvasHeight) {
        super(canvasWidth, canvasHeight); // Calls BaseRoom constructor & checks required methods
        this.controller = null;
        this.build();
    }

    #setUpEnvironment() {
        const ambient = new THREE.HemisphereLight(0x555555, 0xFFFFFF);
        this.scene.add(ambient);

        const light = new THREE.DirectionalLight(0xffffff, 3);
        light.position.set(0, 12.5, 12.5);
        light.castShadow = true;
        light.shadow.radius = 3;
        light.shadow.blurSamples = 8;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;

        const size = 10;
        light.shadow.camera.left = -size;
        light.shadow.camera.bottom = -size;
        light.shadow.camera.right = size;
        light.shadow.camera.top = size;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 50;
        this.scene.add(light);

        const ground = new THREE.Mesh(
            new THREE.BoxGeometry(20, 0.5, 20),
            new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
        );
        ground.receiveShadow = true;
        ground.position.y = -0.25;
        ground.userData.physics = { mass: 0 };
        this.scene.add(ground);
    }

    #setUpPlayers() {
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

    #addProp(fixed, i) {
        const geometry = fixed ? new THREE.BoxGeometry(1, 1, 1) : new THREE.SphereGeometry(0.25);
        const material = new THREE.MeshStandardMaterial({ color: fixed ? 0xFF0000 : 0x00FF00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        mesh.position.set(this.random(-10, 10), 0.5, this.random(-10, 10));
        this.scene.add(mesh);

        if (fixed) {
            // Queues if before enablePhysics(); creates Rapier collider immediately if after
            this.registerInteractable(mesh, "Hello" + i);
        } else {
            // Sets userData.physics if before enablePhysics(); calls physicsEngine.addMesh() immediately if after
            this.registerPhysicsMesh(mesh, 0.5, 0.3);
        }
    }

    build() {
        this.#setUpEnvironment();
        this.#setUpPlayers();

        for (let i = 0; i < 10; i++) {
            this.#addProp(Math.random() > 0.3, i);
        }
    }

    enablePhysics(physicsEngine) {
        this.physicsEngine = physicsEngine;
        this.physicsEngine.addScene(this.scene);

        this.player1.enablePhysics(this.physicsEngine);
        this.player2.enablePhysics(this.physicsEngine);

        this.controller = new PlayerController(this.physicsEngine);
        this.controller.acticateImpulsesToDynamicBodies(3);

        this.initInteractables();
    }

    animate(deltaTime, inputs) {
        return;
    }
}

export default Testing;