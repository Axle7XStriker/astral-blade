import * as THREE from "three";
import GUI from "lil-gui";

import Time from "./utils/Time.js";
import Sizes from "./utils/Sizes.js";
import Stats from "./utils/Stats.js";

import AudioManager from "./AudioManager.js";
import Camera from "./Camera.js";
import Resources from "./Resources.js";
import Renderer from "./Renderer.js";
import World from "./World.js";

import assets from "./assets.js";
import InteractiveControls from "./InteractiveControls.js";

/**
 * The top-level class (singleton) that holds everything related to a Three.js Experience.
 * It is associated with a single HTML element (DOM) within which the whole experience is rendered.
 */
export default class Experience {
    static instance;

    constructor(_options = {}) {
        // Returns the instance, if already initialized before.
        if (Experience.instance) {
            return Experience.instance;
        }

        // Checks for "targetElement" field, if it's being initialized for the first time.
        if (!_options.targetElement) {
            console.warn("Missing 'targetElement' property: %s", _options);
            return;
        }

        // Instantiations
        Experience.instance = this;

        this.targetElement = _options.targetElement;
        this.debugParams = { showThirdPersonView: false };
        // Creating a Time instance also results in its update method being called simultaneously
        // which gets triggered before each frame is rendered. Hence during update process,
        // time update happens before any other object update.
        this.time = new Time();
        this.sizes = new Sizes(this.targetElement);
        this.setConfig();
        this.setDebug();
        this.setStats();
        this.setScene();
        this.setCamera();
        this.setRenderer();
        this.setResources();
        this.setAudioManager();
        this.setInteractiveControls();
        this.setWorld();

        // Events Setup
        this.sizes.on("resize", () => {
            this.resize();
        });

        // Start Rendering...
        this.update();
    }

    setConfig() {
        this.config = {};

        // debug: Renders the Experience in debug-mode, wherein various tweaks (changes)
        // to the Experience can be made.
        this.config.debug = window.location.hash === "#debug";

        // pixelRatio: Used to make rendering consistent across different devices.
        this.config.pixelRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2);

        // width/height: Dimensions of the element on which the Experience will be rendered.
        const boundings = this.targetElement.getBoundingClientRect();
        this.config.width = boundings.width;
        this.config.height = boundings.height || window.innerHeight;
    }

    setDebug() {
        if (this.config.debug) {
            // GUI used to tweak various modifiable parameters of the Experience.
            this.debug = new GUI();
            this.debugFolder = this.debug.addFolder("Experience");
        }
    }

    setStats() {
        if (this.config.debug) {
            // GUI used to monitor the performance of the Experience.
            this.stats = new Stats(true);
        }
    }

    setScene() {
        this.scene = new THREE.Scene();
    }

    setCamera() {
        this.mainCamera = new Camera({ needControls: false, needHelper: this.config.debug });
        if (this.config.debug) {
            this.thirdPersonCamera = new Camera({ needControls: true, needHelper: false });
            // Active camera is the main camera at the start.
            this.thirdPersonCamera.controller.orbitControls.enabled = false;
        }
        if (this.debug) {
            this.debugFolder
                .add(this.debugParams, "showThirdPersonView")
                .onChange((shouldEnable) => {
                    if (shouldEnable) {
                        this.thirdPersonCamera.controller.orbitControls.enabled = true;
                        this.activeCamera = this.thirdPersonCamera;
                    } else {
                        this.thirdPersonCamera.controller.orbitControls.enabled = false;
                        this.activeCamera = this.mainCamera;
                    }
                });
        }
        this.activeCamera = this.mainCamera;
    }

    setRenderer() {
        this.renderer = new Renderer({ rendererInstance: this.rendererInstance });

        this.targetElement.appendChild(this.renderer.instance.domElement);
    }

    setResources() {
        this.resources = new Resources(assets);
    }

    setAudioManager() {
        this.audioManager = new AudioManager();
        // this.targetElement.addEventListener(
        //     "click",
        //     () => {
        //         console.log("Audio added.");
        //         this.audioManager.setupAudio(import.meta.env.BASE_URL + "/assets/preview-3a.mp3");
        //     },
        //     { once: true }
        // );
    }

    setInteractiveControls() {
        this.interactiveControls = new InteractiveControls(
            this.activeCamera.instance,
            this.renderer.instance.domElement
        );
        this.interactiveControls.disable();
    }

    setWorld() {
        this.world = new World();
    }

    /**
     * Used to animate the scene. Called before the rendering of each subsequent frame after first
     * frame is rendered. Updates all the subjects of the scene, the camera, the renderer, and any
     * other object that needs an update.
     */
    update() {
        if (this.stats) this.stats.update();

        this.activeCamera.update();

        if (this.renderer) this.renderer.update();

        if (this.world) this.world.update();

        window.requestAnimationFrame(() => {
            this.update();
        });
    }

    /**
     * Called when the window is resized. Updates the scene to fit to the updated window dimensions.
     */
    resize() {
        // Config
        this.config.width = this.sizes.width;
        this.config.height = this.sizes.height;

        this.config.pixelRatio = Math.min(Math.max(window.devicePixelRatio, 1), 2);

        if (this.mainCamera) this.mainCamera.resize();
        if (this.thirdPersonCamera) this.thirdPersonCamera.resize();

        if (this.renderer) this.renderer.resize();

        if (this.interactiveControls) this.interactiveControls.resize();

        if (this.world) this.world.resize();
    }

    destroy() {}
}
