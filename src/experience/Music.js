import * as THREE from "three";

import Experience from "./Experience.js";
import { fitObjectToBoundingBox } from "./utils/common.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import * as Lottie from "lottie-web";

/** Music view of the experience. */
export default class Music {

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
            if (_group.name === "MusicIllustrations") {
                this.illustrationsData = [
                    this.resources.items.listening, 
                    this.resources.items.singing, 
                    this.resources.items.composing];
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
        this.illustrationStroked = false;
        this.illustrationFilled = false;

        // Iterate through all the paths and their sub-paths to obtain their respective geometries.
        for (let k = 0; k < this.illustrationsData.length; k++) {
            var illustration = new THREE.Group();
            var illustrationStroke = new THREE.Group();
            var illustrationFill = new THREE.Group();
            const paths = this.illustrationsData[k].paths;

            for (let i = 0; i < paths.length; i++) {
                const path = paths[i];

                // Create meshes that fills the SVG model.
                const fillColor = path.userData.style.fill;
                var material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setStyle(fillColor).convertSRGBToLinear(),
                    opacity: path.userData.style.fillOpacity,
                    transparent: false,
                    side: THREE.DoubleSide,
                    depthWrite: true,
                    wireframe: false,
                });

                const shapes = SVGLoader.createShapes(path);
                for (let j = 0; j < shapes.length; j++) {
                    const shape = shapes[j];
                    const geometry = new THREE.ShapeGeometry(shape);
                    const mesh = new THREE.Mesh(geometry, material);
                    illustrationFill.add(mesh);
                }

                // Create meshes that outlines (strokes) the SVG model.
                const strokeColor = path.userData.style.stroke;
                material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color().setStyle(fillColor).convertSRGBToLinear(),
                    opacity: path.userData.style.strokeOpacity,
                    transparent: false,
                    side: THREE.DoubleSide,
                    depthWrite: true,
                    wireframe: false,
                });
                for (let j = 0, jl = path.subPaths.length; j < jl; j++) {
                    const subPath = path.subPaths[j];
                    const geometry = SVGLoader.pointsToStroke(subPath.getPoints(), path.userData.style);
                    if (geometry) {
                        geometry.setDrawRange(0, 0);
                        const mesh = new THREE.Mesh(geometry, material);
                        illustrationStroke.add(mesh);
                    }
                }
            }
            illustration.add(illustrationStroke);
            // Fill mesh won't be visible until the illustration is progressively outlined using the stroke mesh.
            illustrationFill.visible = false;
            illustration.add(illustrationFill);
            this.illustrationsData[k].three = {
                'model': illustration, 
                'stroke': illustrationStroke, 
                'fill': illustrationFill};

            // Center the SVG to (0, 0)
            const boundingBox = new THREE.Box3();
            boundingBox.setFromObject(illustration);
            const size = boundingBox.getSize(new THREE.Vector3());
            illustration.scale.y *= -1;
            illustration.children.forEach((child) => {
                child.position.x = -size.x / 2;
                child.position.y = -size.y / 2;
            });

            this.modelView.add(illustration)
        }
    }

    /** Reset the illustrations to before they were outlined and filled to redo the drawing animation. */
    #resetIllustrations() {
        this.illustrationStroked = false;
        this.illustrationFilled = false;
        for (let i = 0; i < this.illustrationsData.length; i++) {
            this.illustrationsData[i].three.stroke.children.forEach((child) => {
                child.geometry.setDrawRange(0, 0);
            });
            this.illustrationsData[i].three.fill.visible = false;
        }
    }

    /** 
     * The model view is divided into a 2x2 grid with (1, 1) consisting of the HTML area 
     * and the remaining 3 cells consisting of different illustrations.
     */
    #arrangeSubjects() {
        // Landscape Orientation
        if (this.sizes.width > this.sizes.height) {
            fitObjectToBoundingBox(
                this.textPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        0,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(0, 1, this.sizes.width / this.sizes.height + 1)
                )
            );
            // Each illustration has a specific position in the model view. 
            const illustrationsBoxPositions = [
                [[0, 0, -(this.sizes.width / this.sizes.height + 1)], 
                [this.sizes.width / this.sizes.height, 1, this.sizes.width / this.sizes.height + 1]],
                [[-this.sizes.width / this.sizes.height, -1, -(this.sizes.width / this.sizes.height + 1)], 
                [0, 0, this.sizes.width / this.sizes.height + 1]],
                [[0, -1, -(this.sizes.width / this.sizes.height + 1)], 
                [this.sizes.width / this.sizes.height, 0, this.sizes.width / this.sizes.height + 1]]
            ]
            for (let i = 0; i < this.illustrationsData.length; i++) {
                let [x0, y0, z0] = illustrationsBoxPositions[i][0];
                let [x1, y1, z1] = illustrationsBoxPositions[i][1];
                fitObjectToBoundingBox(
                    this.illustrationsData[i].three.model,
                    new THREE.Box3(
                        new THREE.Vector3(x0, y0, z0),
                        new THREE.Vector3(x1, y1, z1)
                    )
                );
                this.illustrationsData[i].three.model.scale.y *= -1;
            }
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
            // Each illustration has a specific position in the model view. 
            const illustrationsBoxPositions = [
                [[-this.sizes.width / this.sizes.height, 0, -(this.sizes.width / this.sizes.height + 1)], 
                [this.sizes.width / this.sizes.height, 1/2, this.sizes.width / this.sizes.height + 1]],
                [[-this.sizes.width / this.sizes.height, -1/2, -(this.sizes.width / this.sizes.height + 1)], 
                [this.sizes.width / this.sizes.height, 0, this.sizes.width / this.sizes.height + 1]],
                [[-this.sizes.width / this.sizes.height, -1, -(this.sizes.width / this.sizes.height + 1)], 
                [this.sizes.width / this.sizes.height, -1/2, this.sizes.width / this.sizes.height + 1]]
            ]
            for (let i = 0; i < this.illustrationsData.length; i++) {
                fitObjectToBoundingBox(
                    this.illustrationsData[i].three.model,
                    new THREE.Box3(
                        new THREE.Vector3(illustrationsBoxPositions[i][0]),
                        new THREE.Vector3(illustrationsBoxPositions[i][1])
                    )
                );
                this.illustrationsData[i].three.model.scale.y *= -1;
            }
        }
    }

    #setupDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xff0000);
            this.modelView.add(modelBoundingBox);
        }
    }

    set() {
        const viewDom = document.querySelector("#music.view");

        // Make the HTML part of the view visible and start animating.
        viewDom.classList.remove("hide");
        viewDom.classList.add("show");

        // Set all the subjects of the scene.

        // Add home view model to the scene.
        this.scene.add(this.modelView);

        // Adjust camera to focus on the view.
        this.camera.focusCamera(this.modelView);
    }

    clear() {
        const viewDom = document.querySelector("#music.view");

        // Make the HTML part of the view invisible and stop animating.
        viewDom.classList.remove("show");
        viewDom.classList.add("hide");

        // Remove home view model from the scene.
        this.scene.remove(this.modelView);

        // Clear out all the subjects of the scene.
        this.#resetIllustrations();
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
        if (this.illustrationsData) {
            // The illustrations are first stroked before they can be filled.
            if (!this.illustrationStroked) {
                // console.log("Stroking...");
                this.illustrationStroked = true;
                for (let i = 0; i < this.illustrationsData.length; i++) {
                    this.illustrationsData[i].three.stroke.children.forEach((child) => {
                        const numPositions = child.geometry.attributes.position.count;
                        const curDrawCount = child.geometry.drawRange['count'];
                        if (curDrawCount < numPositions) {
                            const pointsToAdd = this.time.delta * numPositions / 2000;
                            child.geometry.setDrawRange(0, Math.min(curDrawCount + pointsToAdd, numPositions));
                            this.illustrationStroked = false;
                        }
                    });
                }
            }
            // After the illustrations have been stroked, the fill meshes are made visible.
            if (this.illustrationStroked && !this.illustrationFilled) {
                // console.log("Filling...");
                for (let i = 0; i < this.illustrationsData.length; i++) {
                    this.illustrationsData[i].three.fill.visible = true;
                }
                this.illustrationFilled = true;
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
