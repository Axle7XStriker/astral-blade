import * as THREE from "three";

import Experience from "./Experience.js";
import { fitObjectToBoundingBox } from "./utils/common.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** Fitness view of the experience. */
export default class Fitness {

    constructor(_options = {}) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.camera = this.experience.mainCamera;
        this.renderer = this.experience.renderer;
        this.sizes = this.experience.sizes;
        this.time = this.experience.time;
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
            if (_group.name === "FitnessIllustrations") {
                this.illustrationsData = [this.resources.items.workout, this.resources.items.jogging, this.resources.items.football];
                // Contains the index of the illustration that is currently visible in the model view.
                this.visibleIllustration = 0;
                // Tells if the visible illustration is fading in or out of the view.
                this.fading = false;
                this.#setupIllustrations();
                this.#arrangeSubjects();
            }
        });

        // this.#setupDebugEnvironment();
    }

    #setupViewText() {
        this.textPlane = this.#setupHtmlArea();
        this.modelView.add(this.textPlane);
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

    /** Makes three.js models out of SVG and add it to the model view. */
    #setupIllustrations() {
        this.illustrationsPlane = new THREE.Group();

        // Iterate through all the paths and their sub-paths to obtain their respective geometries.
        for (let k = 0; k < this.illustrationsData.length; k++) {
            var illustration = new THREE.Group();
            const paths = this.illustrationsData[k].paths;

            for (let i = 0; i < paths.length; i++) {
                const path = paths[i];

                // Create meshes that fills the SVG model.
                const fillColor = path.userData.style.fill;
                var material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setStyle(fillColor).convertSRGBToLinear(),
                    opacity: 0, // Each illustration will fade-in and out of the view one-by-one.
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: true,
                    wireframe: false,
                });

                const shapes = SVGLoader.createShapes(path);
                for (let j = 0; j < shapes.length; j++) {
                    const shape = shapes[j];
                    const geometry = new THREE.ShapeGeometry(shape);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.userData.opacity = path.userData.style.fillOpacity;
                    illustration.add(mesh);
                }

                // Create meshes that outlines (strokes) the SVG model.
                const strokeColor = path.userData.style.stroke;
                material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setStyle(fillColor).convertSRGBToLinear(),
                    opacity: 0, // Each illustration will fade-in and out of the view one-by-one.
                    transparent: true,
                    side: THREE.DoubleSide,
                    depthWrite: true,
                    wireframe: false,
                });
                for (let j = 0, jl = path.subPaths.length; j < jl; j++) {
                    const subPath = path.subPaths[j];
                    const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);
                    if (geometry) {
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.userData.opacity = path.userData.style.strokeOpacity;
                    illustration.add(mesh);
                    }
                }
            }
            this.illustrationsData[k].three = illustration;
            this.illustrationsPlane.add(illustration);
        }
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(this.illustrationsPlane);
        const size = boundingBox.getSize(new THREE.Vector3());
        this.illustrationsPlane.scale.y *= -1;
        this.illustrationsPlane.children.forEach((child) => {
            child.position.x = -size.x / 2;
            child.position.y = -size.y / 2;
        });

        this.modelView.add(this.illustrationsPlane);
    }

    /** 
     * The model view is divided into a 1x2 grid with (1, 1) consisting of the HTML area 
     * and (1, 2) consisting of different illustrations that fade-in and out of the view one-by-one.
     */
    #arrangeSubjects() {
        // Landscape Orientation
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
                    new THREE.Vector3(0, -1/3, -(this.sizes.width / this.sizes.height + 1)),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
        // Portrait Orientation
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
                        -1 / 2,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height/1.5,
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
        const viewDom = document.querySelector("#fitness.view");

        // Make the HTML part of the view visible and start animating.
        viewDom.classList.remove("hide");
        viewDom.classList.add("show");

        // Set all the subjects of the scene.

        // Add view model to the scene.
        this.scene.add(this.modelView);
    }

    clear() {
        const viewDom = document.querySelector("#fitness.view");

        // Make the HTML part of the view invisible and stop animating.
        viewDom.classList.remove("show");
        viewDom.classList.add("hide");

        // Remove view model from the scene.
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
        if (this.illustrationsData) {
            if (this.illustrationsData[this.visibleIllustration]) {
                // Slowly make the illustration invisible or fade it out until it's completely invisible.
                if (this.fading) {
                    // console.log("Fading Out...");
                    let visible = false;
                    this.illustrationsData[this.visibleIllustration].three.children.forEach((child) => {
                        if (child.material.opacity > 0)
                            visible = true;
                        child.material.opacity -= 0.001 * this.time.delta * child.userData.opacity;
                    });
                    // Change the visible illustration to the next one and set it to being faded in.
                    if (!visible) {
                        this.visibleIllustration = (this.visibleIllustration + 1) % this.illustrationsData.length;
                        this.fading = false;
                    }
                }
                else {
                    // console.log("Fading In...");
                    let faded = false;
                    this.illustrationsData[this.visibleIllustration].three.children.forEach((child) => {
                        if (child.material.opacity < child.userData.opacity)
                            faded = true;
                        child.material.opacity += 0.0005 * this.time.delta * child.userData.opacity;
                    });
                    // Set the current visible illustration to being faded out.
                    if (!faded) 
                        this.fading = true;
                }
            }
        }

        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
    }

    destroy() {}
}
