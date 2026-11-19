import * as Three from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import PhysicsEngine from "./core/physicsEngine";
import Testing from "../rooms/Testing";

const PLAYER_1 = 'player1';
const PLAYER_2 = 'player2';

/* Entry point for the game */
class GameLoop {
    constructor() {
        // Get canvas to render the game on
        this.gameCanvas = document.getElementById("game-canvas");

        // Initialize the WebGLRenderer
        this.renderer = new Three.WebGLRenderer({
            canvas: this.gameCanvas,
            antialias: true
        });
        this.renderer.setSize(this.gameCanvas.clientWidth, this.gameCanvas.clientHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x272727);
        this.renderer.shadowMap.enabled = true;

        this.initPhysics();
        // this.renderer.setAnimationLoop(this.animation.bind(this));

        this.room = new Testing(this.gameCanvas.clientWidth, this.gameCanvas.clientHeight);

        // Scene
        this.scene = this.room.getScene();

        // Camera
        this.camera = this.room.getCamera();

        // Get the players and map them
        const players = this.room.getPlayers();
        this.player1 = players.player1;
        this.player2 = players.player2;

        this.componentMap = new Map();
        this.componentMap.set(this.player1.name, this.player1);
        this.componentMap.set(this.player2.name, this.player2);

        // Movement inputs
        this.movement1 = { forward: 0, right: 0 };
        this.movement2 = { forward: 0, right: 0 };

        // Helpful components
        this.timer = new Three.Timer();
        this.timer.connect(document);
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        this.addEventListeners();
    }

    async initPhysics() {
        // Initialize the physics
        this.physicsEngine = new PhysicsEngine();
        await this.physicsEngine.init();
        
        // Create event queue to track collisions
        this.eventQueue = new this.physicsEngine.RAPIER.EventQueue(true);

        // Enable the physics in the initial room
        this.room.enablePhysics(this.physicsEngine);

        // Start rendering the world
        this.renderer.setAnimationLoop(this.animation.bind(this));
    }

    addEventListeners() {
        window.addEventListener('keydown', (event) => {

            // Movement input for player 1
            if (event.key === 'w') this.movement1.forward = 1;
            if (event.key === 's') this.movement1.forward = - 1;
            if (event.key === 'a') this.movement1.right = - 1;
            if (event.key === 'd') this.movement1.right = 1;


            // Movement input for player 2
            if (event.key === 'ArrowUp') this.movement2.forward = 1;
            if (event.key === 'ArrowDown') this.movement2.forward = - 1;
            if (event.key === 'ArrowLeft') this.movement2.right = - 1;
            if (event.key === 'ArrowRight') this.movement2.right = 1;

            // Interactions input for player 1
            if (event.key === 'q') {
                this.interact(PLAYER_1, 0);
            } else if (event.key === 'e') {
                this.interact(PLAYER_1, 1);
            }

            // Interactions input for player 2
            if (event.key === '.') {
                this.interact(PLAYER_2, 2);
            } else if (event.key === '/') {
                this.interact(PLAYER_2, 3);
            }

        });

        window.addEventListener('keyup', (event) => {

            if (event.key === 'w' || event.key === 's') this.movement1.forward = 0;
            if (event.key === 'a' || event.key === 'd') this.movement1.right = 0;
            if (event.key === 'ArrowUp' || event.key === 'ArrowDown') this.movement2.forward = 0;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') this.movement2.right = 0;

        });

        window.addEventListener("resize", this.onResize.bind(this));
    }

    onResize() {
        const width = this.gameCanvas.clientWidth;
        const height = this.gameCanvas.clientHeight;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    addToPlayerRange(playerName, interactable) {
        const player = this.componentMap.get(playerName);
        player.addToRange(interactable);
    }

    removeFromPlayerRange(playerName, interactable) {
        const player = this.componentMap.get(playerName);
        player.removeFromRange(interactable);
    }

    interact(playerName, actionType) {
        const player = this.componentMap.get(playerName);
        const interactable = player.getInRange().at(0);

        // Make sure its some sort of interactable object 
        if (interactable === undefined) return;

        switch (interactable) {
            // TODO: Add interactanble function for each pair
            default:
                console.log(interactable, "and", actionType, "don't have an action atached to it")
                break;
        }
    }

    animation() {
        this.timer.update();
        this.stats.update();
        this.renderer.render(this.scene, this.camera);

        // Check that everything is initialized
        if (!this.physicsEngine || !this.eventQueue) return;

        // Move the players
        this.room.movePlayers(this.timer.getDelta(), { movement1: this.movement1, movement2: this.movement2 });

        // Step the world with updated character positions
        this.physicsEngine.world.step(this.eventQueue);

        // Drain collision events
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            // Get the user data of both colliders
            const data1 = this.physicsEngine.world.getCollider(handle1)?.userData;
            const data2 = this.physicsEngine.world.getCollider(handle2)?.userData;
            // Check to see which one is the player
            const isFirst = data1.name.includes('player');


            // Get the names of both objects
            const player = isFirst ? data1.name : data2.name;
            const interactable = !isFirst ? data1.name : data2.name;

            if (started) {
                this.addToPlayerRange(player, interactable);
            } else {
                this.removeFromPlayerRange(player, interactable);
            }

        });
    }
}

// Game entry
new GameLoop();