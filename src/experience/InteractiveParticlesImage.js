import * as THREE from "three";

import Experience from "./Experience";
import InteractiveParticleVertexShader from "./shaders/interactive_particle_vertex.glsl";
import InteractiveParticleFragmentShader from "./shaders/interactive_particle_fragment.glsl";
import EventEmitter from "./utils/EventEmitter";
import TouchTexture from "./TouchTexture";

/** */
export default class InteractiveParticlesImage extends EventEmitter {
    /**
     * @param {int} _options.width - width of the image used.
     * @param {int} _options.height - height of the image used.
     * @param {Uint8} _options.visibilityThreshold - minimum pixel value that should be shown. Improves performance by reducing the number of particles to be rendered.
     */
    constructor(_options = {}) {
        super();
        this.experience = new Experience();
        this.camera = this.experience.mainCamera;
        this.time = this.experience.time;
        this.resources = this.experience.resources;
        this.debug = this.experience.debug;
        this.interactiveControls = this.experience.interactiveControls;

        this.visibilityThreshold = _options.visibilityThreshold || 34;

        this.init(_options);
    }

    init(_options = {}) {
        // Debug GUI
        if (this.debug) {
            this.debugFolder = this.debug.addFolder("InteractiveParticlesImage");
        }

        this.modelView = new THREE.Group();
        this.resources.on("groupEnd", (_group) => {
            if (_group.name === "SelfPics") {
                this.texture = this.resources.items.myFace;
                this.texture.minFilter = THREE.LinearFilter;
                this.texture.magFilter = THREE.LinearFilter;
                this.texture.format = THREE.RGBFormat;
                this.width = _options.width || this.texture.image.width;
                this.height = _options.height || this.texture.image.height;
                this.imageWidth = this.texture.image.width;
                this.imageHeight = this.texture.image.height;
                this.numPoints = this.imageWidth * this.imageHeight;
                this.texture.pixelData = getImagePixelData(
                    this.texture.image,
                    this.imageWidth,
                    this.imageHeight
                );

                this.#initParticleImage();
                this.#initHitArea();
                this.#initTouchTexture();

                this.setDebugEnvironment();

                // this.#addListeners();

                this.finishInit = true;
                this.trigger("finishInit");
            }
        });
    }

    #initParticleImage() {
        this.particleImage = new THREE.Mesh(
            this.#createParticleImageGeometry(),
            this.#createParticleMaterial()
        );

        this.modelView.add(this.particleImage);
    }

    #createParticleImageGeometry() {
        const geometry = new THREE.InstancedBufferGeometry();
        geometry.name = "particle-image-geometry";

        // Setup fixed attributes i.e., {@THREE.BufferAttribute}.
        // Positions
        const positions = new THREE.BufferAttribute(new Float32Array(4 * 3), 3);
        positions.setXYZ(0, -0.5, 0.5, 0.0);
        positions.setXYZ(1, 0.5, 0.5, 0.0);
        positions.setXYZ(2, -0.5, -0.5, 0.0);
        positions.setXYZ(3, 0.5, -0.5, 0.0);
        geometry.setAttribute("position", positions);

        // UVs
        const uvs = new THREE.BufferAttribute(new Float32Array(4 * 2), 2);
        uvs.setXYZ(0, 0.0, 0.0);
        uvs.setXYZ(1, 1.0, 0.0);
        uvs.setXYZ(2, 0.0, 1.0);
        uvs.setXYZ(3, 1.0, 1.0);
        geometry.setAttribute("uv", uvs);

        // Triangle indices
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1));

        // Count number of particles that will be visible according to the visibility threshold.
        // Note: Visibility is checked based on R-value of a pixel. Can be changed to something else as well.
        const originalColors = Float32Array.from(this.texture.pixelData.data);
        let numVisible = 0;
        for (let i = 0; i < this.numPoints; i++) {
            if (originalColors[i * 4 + 0] >= this.visibilityThreshold) numVisible++;
        }
        // console.log(this.numPoints, numVisible);

        // Setup varying attributes i.e., {THREE.InstancedBufferAttribute}.
        const particlesIndex = new Uint16Array(numVisible);
        const offsets = new Float32Array(numVisible * 3);
        const angles = new Float32Array(numVisible);

        for (let i = 0, j = 0; i < this.numPoints; i++) {
            if (originalColors[i * 4 + 0] < this.visibilityThreshold) continue;

            offsets[j * 3 + 0] = ((i % this.imageWidth) * this.width) / this.imageWidth;
            offsets[j * 3 + 1] = (Math.floor(i / this.imageWidth) * this.height) / this.imageHeight;

            particlesIndex[j] = i;

            angles[j] = Math.random() * Math.PI;

            j++;
        }

        geometry.setAttribute(
            "pIndex",
            new THREE.InstancedBufferAttribute(particlesIndex, 1, false)
        );
        geometry.setAttribute("offset", new THREE.InstancedBufferAttribute(offsets, 3, false));
        geometry.setAttribute("angle", new THREE.InstancedBufferAttribute(angles, 1, false));

        return geometry;
    }

    #createParticleMaterial() {
        const uniforms = {
            uTime: { value: 0 }, // elapsed time, updated every frame
            uRandom: { value: 1.0 }, //factor of randomness used to displace the particles in x,y
            uDepth: { value: 2.0 }, // maximum oscillation of the particles in z
            uSize: { value: 1.5 }, // base size of the particles
            uTextureSize: { value: new THREE.Vector2(this.width, this.height) }, // dimensions of the texture
            uTexture: { value: this.texture }, // image texture
            uTouch: { value: null }, // touch texture
        };

        const material = new THREE.RawShaderMaterial({
            uniforms,
            vertexShader: InteractiveParticleVertexShader,
            fragmentShader: InteractiveParticleFragmentShader,
            depthTest: false,
            transparent: true,
            // blending: THREE.AdditiveBlending,
        });

        return material;
    }

    #initHitArea() {
        const geometry = new THREE.PlaneBufferGeometry(this.width, this.height);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            depthTest: false,
        });
        material.visible = this.experience.config.debug;

        this.hitArea = new THREE.Mesh(geometry, material);
        this.modelView.add(this.hitArea);
    }

    #initTouchTexture() {
        this.touchTexture = new TouchTexture();
        this.particleImage.material.uniforms.uTouch.value = this.touchTexture.texture;
    }

    setDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xffff00);
            this.modelView.add(modelBoundingBox);
        }
    }

    set() {
        this.#addListeners();
    }

    #addListeners() {
        this.handlerInteractiveMove = this.#onInteractiveMove.bind(this);

        this.interactiveControls.addListener("interactive-move", this.handlerInteractiveMove);
        this.interactiveControls.objectsToCheck.push(this.hitArea);
        this.interactiveControls.enable();
    }

    clear() {
        this.#removeListeners();
    }

    #removeListeners() {
        this.interactiveControls.removeListener("interactive-move", this.handlerInteractiveMove);

        const index = this.interactiveControls.objectsToCheck.findIndex(
            (obj) => obj === this.hitArea
        );
        this.interactiveControls.objectsToCheck.splice(index, 1);
        this.interactiveControls.disable();
    }

    #onInteractiveMove(e) {
        const uv = e.intersectionData.uv;
        if (this.touchTexture) this.touchTexture.addTouch(uv);
    }

    resize() {}

    update() {
        if (!this.particleImage) return;
        if (this.touchTexture) this.touchTexture.update();

        this.particleImage.material.uniforms.uTime.value += this.time.delta * 0.0025;
    }

    destroy() {
        this.modelView.children.forEach((child) => {
            child.parent.remove(child);
            child.geometry.dispose();
            child.material.dispose();
        });
    }
}

/** Helpers **/

/**
 * Extracts and Returns the pixel data of an {HTMLImageElement}.
 * @param {HTMLImageElement} img - a loaded image whose pixel data needs to be fetched.
 * @returns {ImageData}
 */
function getImagePixelData(img, width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.scale(1, -1); // flip y
    ctx.drawImage(img, 0, 0, width, height * -1);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    return imgData;
}
