import * as THREE from "three";

import Experience from "./Experience.js";
import { fitObjectToBoundingBox } from "./utils/common.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** Physical Fitness view of the experience. */
export default class PhysicalFitness {
    #typedIndividualsTraits;

    constructor(_options = {}) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.camera = this.experience.mainCamera;
        this.renderer = this.experience.renderer;
        this.sizes = this.experience.sizes;
        this.resources = this.experience.resources;
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
        this.resources.on("groupEnd", (_group) => {
            if (_group.name === "PhysicalFitnessIllustrations") {
                this.#setupIllustrations();
                this.#arrangeSubjects();
            }
        });

        // this.#setupDebugEnvironment();
    }

    #setupViewText() {
        this.textPlane = this.#setupHtmlArea();
        this.modelView.add(this.textPlane);

        // Animate individual's traits.
        // this.#typedIndividualsTraits = new Typed("#home .typed-element", {
        //     stringsElement: "#home .typed-strings",
        //     typeSpeed: 100,
        //     backDelay: 2100,
        //     backSpeed: 100,
        //     loop: true,
        //     cursorChar: "█",
        // });
    }

    /**
     * Sets up an invisible dedicated area in the view container to avoid any overlaps between
     * three.js and html components.
     */
    #setupHtmlArea() {
        return new THREE.Mesh(
            new THREE.PlaneBufferGeometry(1, 1),
            new THREE.MeshBasicMaterial({
                wireframe: true,
                depthWrite: false,
                transparent: true,
                opacity: this.experience.config.debug ? 1 : 0,
            })
        );
    }

    #setupIllustrations() {
        this.illustrationsPlane = new THREE.Group();

        // Iterate through all the paths and their sub-paths to obtain their respective geometries.
        const paths = this.resources.items.football.paths;

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];

            const fillColor = path.userData.style.fill;
            var material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setStyle(fillColor).convertSRGBToLinear(),
                opacity: path.userData.style.fillOpacity,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                wireframe: true,
            });

            const shapes = SVGLoader.createShapes(path);
            for (let j = 0; j < shapes.length; j++) {
                const shape = shapes[j];
                const geometry = new THREE.ShapeGeometry(shape);
                const mesh = new THREE.Mesh(geometry, material);
                // this.illustrationsPlane.add(mesh);
            }

            const strokeColor = path.userData.style.stroke;
            material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setStyle(strokeColor).convertSRGBToLinear(),
                opacity: path.userData.style.strokeOpacity,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                wireframe: true,
            });
            console.log(path);
            for (let j = 0, jl = path.subPaths.length; j < jl; j++) {
                const subPath = path.subPaths[j];
                const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);
                if (geometry) {
                    const mesh = new THREE.Mesh(geometry, material);
                    this.illustrationsPlane.add(mesh);
                }
            }
        }
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(this.illustrationsPlane);
        const size = boundingBox.getSize(new THREE.Vector3());
        // for (let i = 0; i < this.illustrationsPlane.children.length; i++) {
        //     const positions =
        //         this.illustrationsPlane.children[i].geometry.getAttribute("position").array;
        //     for (let i = 0; i < positions.length; i += 3) {
        //         positions[i] = -(((positions[i] - boundingBox.min.x) * 2) / size.x - 1);
        //         positions[i + 1] = -(((positions[i + 1] - boundingBox.min.y) * 2) / size.y - 1);
        //     }
        // }
        this.illustrationsPlane.scale.y *= -1;
        this.illustrationsPlane.children.forEach((child) => {
            child.position.x = -size.x / 2;
            child.position.y = -size.y / 2;
        });

        this.modelView.add(this.illustrationsPlane);
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
                this.illustrationsPlane,
                new THREE.Box3(
                    new THREE.Vector3(0, 0, -(this.sizes.width / this.sizes.height + 1)),
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
                        1 / 2,
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
                this.illustrationsPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1 / 4,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1 / 2,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
        }
        this.illustrationsPlane.scale.y *= -1;
    }

    #setupDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xff0000);
            this.modelView.add(modelBoundingBox);
        }
    }

    set() {
        const viewDom = document.querySelector("#physical-fitness.view");

        // Make the HTML part of the view visible and start animating.
        viewDom.classList.remove("hide");
        viewDom.classList.add("show");
        // this.#typedIndividualsTraits.start();

        // Set all the subjects of the scene.

        // Add home view model to the scene.
        this.scene.add(this.modelView);

        // Adjust camera to focus on the view.
        this.camera.focusCamera(this.modelView);
    }

    clear() {
        const viewDom = document.querySelector("#physical-fitness.view");

        // Make the HTML part of the view invisible and stop animating.
        viewDom.classList.remove("show");
        viewDom.classList.add("hide");
        // this.#typedIndividualsTraits.stop();

        // Remove home view model from the scene.
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

        // Adjust camera to focus on the view.
        this.camera.focusCamera(this.modelView);
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
