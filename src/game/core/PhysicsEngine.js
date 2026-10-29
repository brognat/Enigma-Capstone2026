
import * as Three from 'three';
import { RapierPhysics } from 'three/addons/physics/RapierPhysics.js';

class PhysicsEngine {

    constructor(scene) {
        if (!scene.isScene) {
            throw new TypeError("The scene parameter must be a Three.Scene.");
        }
        this.scene = scene;
        this.physics = null;

    }

    /**
     * Initializes the physics enigine and adds the scene
     */
    async init() {
        this.physics = await RapierPhysics();
        this.physics.addScene(this.scene);
    }

    /**
    * Adds the given mesh to this physics simulation..
    * 
    * @param {Three.Mesh} mesh - The mesh to add.
    * @param {number} mass - The mass in kg of the mesh.
    * @param {number} restitution - The restitution of the mesh, usually from 0 to 1. Represents how "bouncy" objects are when they collide with each other.
    */
    addMesh(mesh, mass, restitution) {
        this.physics.addMesh(mesh, mass, restitution);
    }

    /**
     * Removes the given mesh from this physics simulation.
     * 
     * @param {Three.Mesh} mesh - The mesh to remove.
     */
    removeMesh(mesh) {
        this.physics.removeMesh(mesh);
    }
}

export default PhysicsEngine;