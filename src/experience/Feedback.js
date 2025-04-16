import * as THREE from "three";
import { Formio } from "formiojs";

import Experience from "./Experience.js";
import SpiralParticleVertexShader from "./shaders/spiral_particle_vertex.glsl";
import SpiralParticleFragmentShader from "./shaders/spiral_particle_fragment.glsl";
import SphereContainerVertexShader from "./shaders/sphere_container_vertex.glsl";
import SphereContainerFragmentShader from "./shaders/sphere_container_fragment.glsl";
import { fitObjectToBoundingBox } from "./utils/common.js";

/** Feedback view of the experience. */
export default class Feedback {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.camera = this.experience.mainCamera;
        this.renderer = this.experience.renderer;
        this.sizes = this.experience.sizes;
        this.time = this.experience.time;
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
        this.#setupViewText();
        this.#setupFeedbackForm();
        this.#setupSphereContainer();
        this.#arrangeSubjects();
    }

    #setupViewText() {
        this.#setupHtmlArea();
    }

    #setupHtmlArea() {
        this.textPlane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(1, 1),
            new THREE.MeshBasicMaterial({
                wireframe: true,
                depthWrite: false,
                transparent: true,
                opacity: this.experience.config.debug ? 1 : 0,
            })
        );

        this.modelView.add(this.textPlane);
    }

    #setupFeedbackForm() {
        Formio.createForm(
            document.getElementById("feedback-form"),
            "https://uiufqtatpumqtyz.form.io/feedback-form"
        ).then(function (form) {
            form.on("submit", function (submission) {
                console.log(submission);
            });
        });
    }

    // Creates a colorful spiral model
    #setupSpiral() {
        this.parameters = {
            count: 2000,
            max: 12.5 * Math.PI,
            a: 2,
            c: 4.5,
        };
        this.data = 0;

        this.spiralMaterial = new THREE.ShaderMaterial({
            vertexShader: SpiralParticleVertexShader,
            fragmentShader: SpiralParticleFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uSize: { value: 0.045 },
            },
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const count = this.parameters.count;
        const scales = new Float32Array(count * 1);
        const colors = new Float32Array(count * 3);
        const phis = new Float32Array(count);
        const randoms = new Float32Array(count);
        const randoms1 = new Float32Array(count);
        const colorChoices = ["pink", "green", "cyan", "wheat", "red"];

        const squareGeometry = new THREE.PlaneGeometry(1, 1);
        this.instancedGeometry = new THREE.InstancedBufferGeometry();
        Object.keys(squareGeometry.attributes).forEach((attr) => {
            this.instancedGeometry.attributes[attr] = squareGeometry.attributes[attr];
        });
        this.instancedGeometry.index = squareGeometry.index;
        this.instancedGeometry.maxInstancedCount = count;

        for (let i = 0; i < count; i++) {
            const i3 = 3 * i;
            const colorIndex = Math.floor(Math.random() * colorChoices.length);
            const color = new THREE.Color(colorChoices[colorIndex]);
            phis[i] = Math.random() * this.parameters.max;
            randoms[i] = Math.random();
            scales[i] = Math.random();
            colors[i3 + 0] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        this.instancedGeometry.setAttribute(
            "phi",
            new THREE.InstancedBufferAttribute(phis, 1, false)
        );
        this.instancedGeometry.setAttribute(
            "random",
            new THREE.InstancedBufferAttribute(randoms, 1, false)
        );
        this.instancedGeometry.setAttribute(
            "aScale",
            new THREE.InstancedBufferAttribute(scales, 1, false)
        );
        this.instancedGeometry.setAttribute(
            "aColor",
            new THREE.InstancedBufferAttribute(colors, 3, false)
        );
        this.spiral = new THREE.Mesh(this.instancedGeometry, this.spiralMaterial);
        return this.spiral;
    }

    // Creates a sphere container that holds the spiral within it
    #setupSphereContainer() {
        this.extMaterial = new THREE.ShaderMaterial({
            vertexShader: SphereContainerVertexShader,
            fragmentShader: SphereContainerFragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color("orange") },
            },
            wireframe: true,
            transparent: true,
        });
        const geometry = new THREE.SphereGeometry(6, 128, 128);
        this.sphereContainer = new THREE.Mesh(geometry, this.extMaterial);
        this.sphereContainer.add(this.#setupSpiral());
        this.modelView.add(this.sphereContainer);
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
                this.sphereContainer,
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
                this.sphereContainer,
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
        const viewDom = document.querySelector("#feedback.view");

        // Make the HTML part of the view visible and start animating.
        viewDom.classList.remove("hide");
        viewDom.classList.add("show");

        // Add view model to the scene.
        this.scene.add(this.modelView);
    }

    clear() {
        const viewDom = document.querySelector("#feedback.view");

        // Make the HTML part of the view invisible and stop animating.
        viewDom.classList.remove("show");
        viewDom.classList.add("hide");

        // Add home view model to the scene.
        this.scene.remove(this.modelView);

        // Clear out all the subjects of the scene.
    }

    resize() {
        this.subjects.forEach((obj) => {
            if (typeof obj.resize === "function") {
                obj.resize();
            }
        });

        this.#arrangeSubjects();
        this.container.scale.set(
            this.sizes.width / this.sizes.height,
            1,
            this.sizes.width / this.sizes.height + 1
        );
    }

    update() {
        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
        this.#updateSpiralAndSphereContainer();
    }

    #updateSpiralAndSphereContainer() {
        this.spiralMaterial.uniforms.uTime.value +=
            this.time.delta * 0.0005 * (1 + this.data * 0.2);
        this.extMaterial.uniforms.uTime.value += this.time.delta * 0.0005;
        this.sphereContainer.rotation.y += 0.0001 * this.time.delta;
    }

    destroy() {}
}
