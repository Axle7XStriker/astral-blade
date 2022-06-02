import * as THREE from "three";
import Experience from "./Experience.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";

/** Takes care of creating and handling everything associated with the renderer. */
export default class Renderer {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.config = this.experience.config;
        this.debug = this.experience.debug;
        this.stats = this.experience.stats;
        this.time = this.experience.time;
        this.sizes = this.experience.sizes;
        this.scene = this.experience.scene;
        this.camera = this.experience.camera;

        this.debugParams = { clearColor: "#010101" };

        // Debug
        if (this.debug) {
            this.debugFolder = this.debug.addFolder("Renderer");
        }

        this.usePostprocess = false;

        this.setInstance();
        this.setPostProcess();
    }

    /**
     * Creates an instance of WebGLRenderer and configures it according to the
     * Experience's requirements.
     */
    setInstance() {
        // Renderer
        this.instance = new THREE.WebGLRenderer({ antialias: true });
        this.instance.domElement.style.position = "fixed";
        this.instance.domElement.style.top = "0%";
        this.instance.domElement.style.left = "0%";
        this.instance.domElement.style.width = "100%";
        this.instance.domElement.style.height = "100%";
        this.instance.domElement.style.outline = "none";

        this.instance.setClearColor(this.debugParams.clearColor, 1);
        this.instance.setSize(this.config.width, this.config.height);
        this.instance.setPixelRatio(this.config.pixelRatio);

        this.instance.physicallyCorrectLights = true;
        // this.instance.gammaOutPut = true
        this.instance.outputEncoding = THREE.sRGBEncoding;
        // this.instance.shadowMap.type = THREE.PCFSoftShadowMap
        // this.instance.shadowMap.enabled = false
        this.instance.toneMapping = THREE.NoToneMapping;
        this.instance.toneMappingExposure = 1;

        this.context = this.instance.getContext();

        // Add stats panel
        if (this.stats) {
            this.stats.setRenderPanel(this.context);
        }

        // Debug
        if (this.debug) {
            this.debugFolder.addColor(this.debugParams, "clearColor").onChange(() => {
                this.instance.setClearColor(this.debugParams.clearColor);
            });

            this.debugFolder
                .add(this.instance, "toneMapping", {
                    NoToneMapping: THREE.NoToneMapping,
                    LinearToneMapping: THREE.LinearToneMapping,
                    ReinhardToneMapping: THREE.ReinhardToneMapping,
                    CineonToneMapping: THREE.CineonToneMapping,
                    ACESFilmicToneMapping: THREE.ACESFilmicToneMapping,
                })
                .onChange(() => {
                    this.scene.traverse((_child) => {
                        if (_child instanceof THREE.Mesh) _child.material.needsUpdate = true;
                    });
                });

            this.debugFolder.add(this.instance, "toneMappingExposure").min(0).max(10);
        }
    }

    /** Sets up EffectComposer and RenderPass for adding post-processing effect to the scene. */
    setPostProcess() {
        this.postProcess = {};

        /**
         * Render pass
         */
        this.postProcess.renderPass = new RenderPass(this.scene, this.camera.instance);

        /**
         * Effect composer
         */
        const RenderTargetClass =
            this.config.pixelRatio >= 2
                ? THREE.WebGLRenderTarget
                : THREE.WebGLMultisampleRenderTarget;
        // const RenderTargetClass = THREE.WebGLRenderTarget
        this.renderTarget = new RenderTargetClass(this.config.width, this.config.height, {
            generateMipmaps: false,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBFormat,
            encoding: THREE.sRGBEncoding,
        });
        this.postProcess.composer = new EffectComposer(this.instance, this.renderTarget);
        this.postProcess.composer.setSize(this.config.width, this.config.height);
        this.postProcess.composer.setPixelRatio(this.config.pixelRatio);

        this.postProcess.composer.addPass(this.postProcess.renderPass);
    }

    /** Updates the renderer when the screen is resized. */
    resize() {
        // Instance
        this.instance.setSize(this.config.width, this.config.height);
        this.instance.setPixelRatio(this.config.pixelRatio);

        // Post process
        this.postProcess.composer.setSize(this.config.width, this.config.height);
        this.postProcess.composer.setPixelRatio(this.config.pixelRatio);
    }

    /**
     * Updates the Renderer properties and any other helpers used for debugging before each
     * frame is rendered.
     */
    update() {
        if (this.stats) {
            this.stats.beforeRender();
        }

        if (this.usePostprocess) {
            this.postProcess.composer.render();
        } else {
            this.instance.render(this.scene, this.camera.instance);
        }

        if (this.stats) {
            this.stats.afterRender();
        }
    }

    /**
     * Removes objects from the memory that are being removed and hence will not be used
     * or when the experience is shutting down.
     */
    destroy() {
        this.instance.renderLists.dispose();
        this.instance.dispose();
        this.renderTarget.dispose();
        this.postProcess.composer.renderTarget1.dispose();
        this.postProcess.composer.renderTarget2.dispose();
    }
}
