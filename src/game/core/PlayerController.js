class PlayerController {

    constructor(physics, player, offset = 0.01) {
        this.physics = physics;
        this.player = player;
        this.offset = offset;
        this.characterController = null;

        this.#init();
    }

    /**
     * Initializes the physics enigine and adds the scene
     */
    #init() {
        // Rapier Character Controller
        this.characterController = this.physics.world.createCharacterController(this.offset);
    }

    /**
     * Enable the application of impulses to objects hit by the players
     * @param {number} mass - The mass of the character to be used for impulses 
     */
    acticateImpulsesToDynamicBodies(mass) {
        this.characterController.setApplyImpulsesToDynamicBodies(true);
        this.characterController.setCharacterMass(mass);
    }

    /**
     * Computes the movement for player based on the movement input
     * @param {ColliderDesc} collider - The player collider
     * @param {{forward:number, right:number}} movement - The movement input 
     * @param {number} delta - The change in time (in seconds) since the last frame was rendedered
     * @param {number} speed - The speed for the player to move at
     */
    computedMovement(collider, movement, delta, speed) {
        // Player movement
        const distance = speed * delta;
        const moveVector = new this.physics.RAPIER.Vector3(movement.right * distance, 0, -movement.forward * distance);
        this.characterController.computeColliderMovement(collider, moveVector);

        // Return the results
        return this.characterController.computedMovement();
    }

}

export default PlayerController;