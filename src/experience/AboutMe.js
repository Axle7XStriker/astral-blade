import * as THREE from "three";

import Experience from "./Experience.js";
import InteractiveParticlesImage from "./InteractiveParticlesImage.js";
import { fitObjectToBoundingBox } from "./utils/common.js";

/** About-Me view of the experience. */
export default class AboutMe {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.camera = this.experience.mainCamera;
        this.renderer = this.experience.renderer;
        this.sizes = this.experience.sizes;
        this.init();
    }

    init() {
        // A collection of all the spawned subjects.
        this.subjects = [];

        // Initialize all the elements to put in the view.
        this.modelView = new THREE.Group();
        this.container = new THREE.Mesh(
            new THREE.BoxBufferGeometry(2, 2, 2),
            new THREE.MeshBasicMaterial({
                wireframe: true,
                depthWrite: false,
                transparent: true,
                opacity: this.experience.config.debug ? 1 : 0,
            })
        );
        this.container.scale.set(
            this.sizes.width / this.sizes.height,
            1,
            this.sizes.width / this.sizes.height + 1
        );
        this.modelView.add(this.container);
        this.#setupInteractiveParticleImage();
        this.interactiveParticleImage.on("finishInit", () => {
            this.#setupViewText();
            this.#arrangeSubjects();
            this.#setupDebugEnvironment();

            this.finishInit = true;
        });
    }

    #setupInteractiveParticleImage() {
        this.interactiveParticleImage = new InteractiveParticlesImage({
            visibilityThreshold: 34,
        });

        this.modelView.add(this.interactiveParticleImage.modelView);
        this.subjects.push(this.interactiveParticleImage);
    }

    #setupViewText() {
        this.#setupTextArea(
            this.interactiveParticleImage.width,
            this.interactiveParticleImage.height
        );
    }

    #setupTextArea(width, height) {
        this.textPlane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(width, height),
            new THREE.MeshBasicMaterial({
                wireframe: this.experience.config.debug,
                transparent: true,
                opacity: this.experience.config.debug ? 1 : 0,
            })
        );

        this.modelView.add(this.textPlane);
    }

    #arrangeSubjects() {
        if (this.sizes.width > this.sizes.height) {
            fitObjectToBoundingBox(
                this.textPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(0, 1, this.sizes.width / this.sizes.height + 1)
                )
            );
            fitObjectToBoundingBox(
                this.interactiveParticleImage.modelView,
                new THREE.Box3(
                    new THREE.Vector3(0, -1, -(this.sizes.width / this.sizes.height + 1)),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
        } else {
            fitObjectToBoundingBox(
                this.textPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        0,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
            fitObjectToBoundingBox(
                this.interactiveParticleImage.modelView,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        0,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
        }
    }

    #setupDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xff0000);
            this.modelView.add(modelBoundingBox);
        }
    }

    set() {
        const aboutMeViewDom = document.querySelector("#about-me.view");

        // Make the HTML part of the view visible and start animating.
        aboutMeViewDom.classList.remove("hide");
        aboutMeViewDom.classList.add("show");

        // Add home view model to the scene.
        this.scene.add(this.modelView);

        if (this.interactiveParticleImage.finishInit) {
            this.interactiveParticleImage.set();
        } else {
            this.interactiveParticleImage.on("finishInit", () => {
                this.interactiveParticleImage.set();
            });
        }
    }

    clear() {
        const aboutMeViewDom = document.querySelector("#about-me.view");

        // Make the HTML part of the view invisible and stop animating.
        aboutMeViewDom.classList.remove("show");
        aboutMeViewDom.classList.add("hide");

        // Add home view model to the scene.
        this.scene.remove(this.modelView);

        // Clear out all the subjects of the scene.
        this.interactiveParticleImage.clear();
    }

    resize() {
        this.subjects.forEach((obj) => {
            if (typeof obj.resize === "function") {
                obj.resize();
            }
        });

        if (this.finishInit) {
            this.#arrangeSubjects();
            this.container.scale.set(
                this.sizes.width / this.sizes.height,
                1,
                this.sizes.width / this.sizes.height + 1
            );
        }
    }

    update() {
        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
    }

    destroy() {}
}
