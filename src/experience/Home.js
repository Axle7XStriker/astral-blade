import * as THREE from "three";
import { ObjectControls } from "threejs-object-controls";
import Typed from "typed.js";

import AtomNavigator from "./AtomNavigator.js";
import Experience from "./Experience.js";
import { fitObjectToBoundingBox } from "./utils/common.js";

/** Home view of the experience. */
export default class Home {
    #typedIndividualsTraits;

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
        this.#setupViewText();
        this.#setupAtomNavigator();
        this.#arrangeSubjects();

        // this.#setupDebugEnvironment();
    }

    #setupAtomNavigator() {
        this.atomNavigator = new AtomNavigator({
            nucleusRadius: 1.0,
            electronNucleusSizeRatio: 0.2,
        });
        // console.log(this.atomNavigator);

        var controls = new ObjectControls(
            this.camera.instance,
            this.renderer.instance.domElement,
            this.atomNavigator.modelView
        );
        controls.disableZoom();
        controls.enableHorizontalRotation();
        controls.enableVerticalRotation();
        controls.setRotationSpeed(0.01);
        controls.setRotationSpeedTouchDevices(0.01);

        this.modelView.add(this.atomNavigator.modelView);
        this.subjects.push(this.atomNavigator);
    }

    #setupViewText() {
        this.#setupTextArea();

        // Animate individual's traits.
        this.#typedIndividualsTraits = new Typed("#home .typed-element", {
            stringsElement: "#home .typed-strings",
            typeSpeed: 100,
            backDelay: 2100,
            backSpeed: 100,
            loop: true,
            cursorChar: "█",
        });
    }

    #setupTextArea() {
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
                this.atomNavigator.modelView,
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
                this.atomNavigator.modelView,
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
        const homeViewDom = document.querySelector("#home.view");

        // Make the HTML part of the view visible and start animating.
        homeViewDom.classList.remove("hide");
        homeViewDom.classList.add("show");
        this.#typedIndividualsTraits.start();

        // Set all the subjects of the scene.
        this.atomNavigator.set();

        // Add home view model to the scene.
        this.scene.add(this.modelView);

        // Adjust camera to focus on the view.
        this.camera.focusCamera(this.modelView);
    }

    clear() {
        const homeViewDom = document.querySelector("#home.view");

        // Make the HTML part of the view invisible and stop animating.
        homeViewDom.classList.remove("show");
        homeViewDom.classList.add("hide");
        this.#typedIndividualsTraits.stop();

        // Remove home view model from the scene.
        this.scene.remove(this.modelView);

        // Clear out all the subjects of the scene.
        this.atomNavigator.clear();
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
