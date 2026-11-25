// rooms/BaseRoom.js
import * as THREE from 'three';

class BaseRoom {
    constructor(canvasWidth, canvasHeight) {
        // Prevent direct instantiation (`new BaseRoom()` will fail)
        if (new.target === BaseRoom) {
            throw new TypeError("Cannot construct BaseRoom instances directly. Extend it instead.");
        }

        // Fail if a subclass forgot to implement required methods
        const requiredMethods = ['build', 'setUpPlayers', 'enablePhysics', 'animate'];
        for (const method of requiredMethods) {
            if (this[method] === BaseRoom.prototype[method]) {
                throw new TypeError(`${new.target.name} must implement the ${method}() method.`);
            }
        }

        // Save in case its needed later
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Shared state available to all rooms
        this.physicsEngine = null;
        this.player1 = null;
        this.player2 = null;
        this.controller = null;
        this.speed = 2.5 // Default
        this.pendingInteractables = [];

        this.scene = new THREE.Scene();

        // Basic Camera feel free to change it
        this.camera = new THREE.PerspectiveCamera(60, canvasWidth / canvasHeight, 0.1, 100);
        this.camera.position.set(2, 5, 15);

    }

    // ==========================================
    // SHARED METHODS (Inherited & ready to use)
    // ==========================================


    onResize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.canvasWidth = width;
        this.canvasHeight = height;
    }
    
    movePlayers(deltaTime, movements) {
        const movement1 = movements.movement1;
        const movement2 = movements.movement2;

        // Update player positions
        const translation1 = this.controller.computedMovement(this.player1.getCollider(), movement1, deltaTime, this.speed);
        this.player1.translate(translation1);

        const translation2 = this.controller.computedMovement(this.player2.getCollider(), movement2, deltaTime, this.speed);
        this.player2.translate(translation2);
    }

    initInteractables() {
        for (const { mesh, onInteract } of this.pendingInteractables) {
            this.addInteractable(mesh, onInteract);
        }
        this.pendingInteractables = [];
    }

    registerInteractable(mesh, onInteract) {
        if (this.physicsEngine) {
            this.addInteractable(mesh, onInteract);
        } else {
            this.pendingInteractables.push({ mesh, onInteract });
        }
    }

    addInteractable(mesh, onInteract) {
        mesh.geometry.computeBoundingBox();
        const bb = mesh.geometry.boundingBox;
        const hx = (bb.max.x - bb.min.x) / 2;
        const hy = (bb.max.y - bb.min.y) / 2;
        const hz = (bb.max.z - bb.min.z) / 2;

        const collider = this.physicsEngine.world.createCollider(
            this.physicsEngine.RAPIER.ColliderDesc
                .cuboid(hx, hy, hz)
                .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
                .setActiveEvents(this.physicsEngine.RAPIER.ActiveEvents.COLLISION_EVENTS) // Enables event reporting
                .setActiveCollisionTypes(
                    this.physicsEngine.RAPIER.ActiveCollisionTypes.DEFAULT |
                    this.physicsEngine.RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED
                ),
            // If attached to a rigid body, pass it here; otherwise leave blank for fixed world colliders
        );

        collider.userData = { name: onInteract };
    }

    registerPhysicsMesh(mesh, mass, restitution = 0) {
        if (this.physicsEngine) {
            this.physicsEngine.addMesh(mesh, mass, restitution);
        } else {
            mesh.userData.physics = { mass, restitution };
        }
    }

    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    setPlayer1(player) {
        this.player1 = player;
    }

    setPlayer2(player) {
        this.player2 = player;
    }

    setSpeed(newSpeed) {
        this.speed = newSpeed;
        return this.speed;
    }

    getScene() {
        return this.scene;
    }

    getCamera() {
        return this.camera;
    }

    getPlayers() {
        return { player1: this.player1, player2: this.player2 };
    }

    // ===========================================
    // ABSTRACT METHODS (Subclasses MUST override)
    // ===========================================

    /**
     * Build the room's lights, geometry, and props (no physics yet).
     */
    build() {
        throw new Error("Method 'build()' must be implemented.");
    }

    /**
     * Build the players players.
     */
    setUpPlayers() {
        throw new Error("Method 'setUpPlayers()' must be implemented.");
    }

    /**
     * Attach the PhysicsEngine, initialize colliders, controllers, and interactable
     */
    enablePhysics(physicsEngine) {
        throw new Error("Method 'enablePhysics(physicsEngine)' must be implemented.");
    }

    /**
     * Update room logic.
     */
    animate(deltaTime, inputs) {
        throw new Error("Method 'animate(deltaTime, inputs)' must be implemented.");
    }

}

export default BaseRoom;