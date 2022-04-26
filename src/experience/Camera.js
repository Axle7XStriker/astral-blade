import * as THREE from "three";
import Experience from "./Experience.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Creates and handles everything related to a Camera. */
export default class Camera {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.config = this.experience.config;
        this.debug = this.experience.debug;
        this.time = this.experience.time;
        this.sizes = this.experience.sizes;
        this.targetElement = this.experience.targetElement;
        this.scene = this.experience.scene;

        // Setup camera.
        this.setInstance();

        // Setup camera controller.
        this.controller = {};
        this.controller.active = _options.active === undefined ? false : _options.active;
        this.setController();
    }

    /** Creates an instance of the specified camera and add it to the scene. */
    setInstance() {
        // Set up
        this.instance = new THREE.PerspectiveCamera(
            25,
            this.config.width / this.config.height,
            0.1,
            150
        );
        this.instance.rotation.reorder("YXZ");

        this.scene.add(this.instance);
    }

    /**
     * Sets up the camera controller that can be used to view the scene from different
     * angles and distances.
     */
    setController() {
        // Create a clone of the main camera which will be passed to the controller and
        // will be used to update the properties of the main camera during the course of
        // the experience.
        this.controller.instance = this.instance.clone();
        this.controller.instance.rotation.reorder("YXZ");
        this.controller.instance.position.set(5, 5, 5);

        this.controller.orbitControls = new OrbitControls(
            this.controller.instance,
            this.targetElement
        );
        this.controller.orbitControls.enabled = this.controller.active;
        this.controller.orbitControls.screenSpacePanning = true;
        this.controller.orbitControls.enableKeys = false;
        this.controller.orbitControls.zoomSpeed = 0.25;
        this.controller.orbitControls.enableDamping = true;
        this.controller.orbitControls.update();
    }

    /** Updates the camera when the screen is resized. */
    resize() {
        // Update main camera.
        this.instance.aspect = this.config.width / this.config.height;
        this.instance.updateProjectionMatrix();

        // Update camera clone(s).
        this.controller.instance.aspect = this.config.width / this.config.height;
        this.controller.instance.updateProjectionMatrix();
    }

    /**
     * Updates the Camera properties and any other helpers used in debugging before each frame
     * is rendered.
     */
    update() {
        // Update debug orbit controls
        this.controller.orbitControls.update();

        // Apply coordinates
        this.instance.position.copy(this.controller.instance.position);
        this.instance.quaternion.copy(this.controller.instance.quaternion);
        this.instance.updateMatrixWorld(); // To be used in projection
    }

    /**
     * Removes objects from the memory that are being removed and hence will not be used
     * or when the experience is shutting down.
     */
    destroy() {
        this.controller.orbitControls.destroy();
    }
}
