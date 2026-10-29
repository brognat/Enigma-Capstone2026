class Player {

    constructor(mesh, physics) {
        this.mesh = mesh;
        this.physics = physics;

        this.#init();
    }

    /**
     * Initializes the physics enigine and adds the scene
     */
    #init() {
        // Get parameters for Rapier cuboid collider
        this.mesh.geometry.computeBoundingBox();
        const halfWidth = (this.mesh.geometry.boundingBox.max.x - this.mesh.geometry.boundingBox.min.x) / 2;
        const halfHeight = (this.mesh.geometry.boundingBox.max.y - this.mesh.geometry.boundingBox.min.y) / 2;
        const halfDepth = (this.mesh.geometry.boundingBox.max.z - this.mesh.geometry.boundingBox.min.z) / 2;
        this.mesh.geometry.boundingBox = null;

        // Get the player postion 
        const x = this.mesh.position.x;
        const y = this.mesh.position.y;
        const z = this.mesh.position.z;

        // Make a the collider
        const colliderDesc = this.physics.RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfDepth);
        colliderDesc.setTranslation(x, y, z);
        this.mesh.userData.collider = this.physics.world.createCollider(colliderDesc);
    }


    /**
     * Moves the player based on the translation combuted by the character controller
     * @param {number} translation - The translation that should be applied to the player
     */
    translate(translation) {
        // Mover the collider
        const position = this.mesh.userData.collider.translation();
        position.x += translation.x;
        position.y += translation.y;
        position.z += translation.z;
        this.mesh.userData.collider.setTranslation(position);

        // Sync Three.js mesh with Rapier collider
        this.mesh.position.set(position.x, position.y, position.z);
    }

    getCollider(){
        return this.mesh.userData.collider;
    }

}

export default Player;