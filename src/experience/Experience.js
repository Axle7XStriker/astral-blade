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
        this.camera = new Camera({ active: false });
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
        //         this.audioManager.setupAudio("/assets/preview-3a.mp3");
        //     },
        //     { once: true }
        // );
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

        this.camera.update();

        if (this.world) this.world.update();

        if (this.renderer) this.renderer.update();

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

        if (this.camera) this.camera.resize();

        if (this.renderer) this.renderer.resize();

        if (this.world) this.world.resize();
    }

    destroy() {}
}
