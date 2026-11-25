// Adapted from https://github.com/mrdoob/three.js/blob/master/examples/physics_rapier_character_controller.html

class Player {

    constructor(mesh, name, physics = null) {
        this.mesh = mesh;
        this.name = name;
        this.physics = null;
        this.body = null;
        this.collider = null;
        this.zone = null;
        // List to track what objects are in range of the user
        this.inRange = [];

        if (physics) {
            this.enablePhysics(physics);
        }
    }

    enablePhysics(physics) {
        this.physics = physics;
        const RAPIER = this.physics.RAPIER;

        // Create kinematic body
        const { x, y, z } = this.mesh.position;
        this.body = this.physics.world.createRigidBody(
            RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z)
        );

        // Get parameters for Rapier cuboid collider
        this.mesh.geometry.computeBoundingBox();
        const bb = this.mesh.geometry.boundingBox;
        const halfWidth = (bb.max.x - bb.min.x) / 2;
        const halfHeight = (bb.max.y - bb.min.y) / 2;
        const halfDepth = (bb.max.z - bb.min.z) / 2;

        // Solid collider for the player's body 
        this.collider = this.physics.world.createCollider(
            RAPIER.ColliderDesc.cuboid(halfWidth, halfHeight, halfDepth),
            this.body
        );

        // Interaction zone collider
        const pad = 0.25; // Temporary until full implementation
        this.zone = this.physics.world.createCollider(
            RAPIER.ColliderDesc
                .cuboid(halfWidth + pad, halfHeight + pad, halfDepth + pad)
                .setSensor(true)
                .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                .setActiveCollisionTypes(
                    RAPIER.ActiveCollisionTypes.DEFAULT | RAPIER.ActiveCollisionTypes.KINEMATIC_FIXED
                ),
            this.body
        );

        // Add helpful and neccesary stuff into userdata
        this.mesh.userData.collider = this.collider;
        this.mesh.userData.zone = this.zone;
        this.zone.userData = { name: this.name };
    }

    /**
     * Moves the player based on the translation combuted by the character controller
     * @param {Vector3} translation - The translation that should be applied to the player
     */
    translate(translation) {
        this.mesh.position.x += translation.x;
        this.mesh.position.y += translation.y;
        this.mesh.position.z += translation.z;

        // Moving the body moves both the solid collider and the zone
        if (this.body) {
            this.body.setNextKinematicTranslation(this.mesh.position);
        }
    }

    addToRange(objectName) {
        this.inRange.push(objectName);
    }

    removeFromRange(objectName) {
        const index = this.inRange.indexOf(objectName);
        if (index == -1) {
            console.log(objectName + " not in range!")
            return false;
        }
        this.inRange.splice(index, 1);
        return true;
    }

    getCollider() {
        return this.collider;
    }

    getZone() {
        return this.zone;
    }

    getInRange() {
        return this.inRange;
    }

}

export default Player;