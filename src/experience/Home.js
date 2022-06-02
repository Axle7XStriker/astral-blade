import * as THREE from "three";
import { ObjectControls } from "threejs-object-controls";
import Typed from "typed.js";

import AtomNavigator from "./AtomNavigator.js";
import Experience from "./Experience.js";

/** Home view of the experience. */
export default class Home {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.camera = this.experience.camera;
        this.renderer = this.experience.renderer;

        // A collection of all the spawned subjects.
        this.subjects = [];

        // Initialize all the elements to put in the view.
        this.modelView = new THREE.Group();
        this.setAtomNavigator();
        this.setViewText();
        this.setDebugEnvironment();

        // Add home view model to the scene.
        this.scene.add(this.modelView);

        // Adjust camera to focus on the view.
        this.camera.focusCamera(this.modelView);
    }

    setAtomNavigator() {
        this.atomNavigator = new AtomNavigator({
            nucleusRadius: 1.0,
            electronCount: 7,
            electronNucleusSizeRatio: 0.2,
        });
        this.atomNavigator.modelView.position.set(5, 0, 0);
        // console.log(this.atomNavigator);

        var controls = new ObjectControls(
            this.camera.instance,
            this.renderer.instance.domElement,
            this.atomNavigator.modelView
        );

        this.modelView.add(this.atomNavigator.modelView);
        this.subjects.push(this.atomNavigator);
    }

    setViewText() {
        this.createTextArea();

        const homeViewDom = document.querySelector("#home.view");

        // Make the view visible.
        homeViewDom.classList.remove("hide");
        homeViewDom.classList.add("show");

        // Animate individual's traits.
        const typedIndividualsTraits = new Typed("#home .typed-element", {
            stringsElement: "#home .typed-strings",
            typeSpeed: 100,
            backDelay: 2100,
            backSpeed: 100,
            loop: true,
            cursorChar: "█",
        });
    }

    createTextArea() {
        const introPlane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(10, 10),
            new THREE.MeshBasicMaterial({
                wireframe: this.experience.config.debug,
                transparent: true,
                opacity: this.experience.config.debug ? 1 : 0,
            })
        );
        introPlane.position.set(-5, 0, 0);

        this.modelView.add(introPlane);
    }

    setDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xff0000);
            this.modelView.add(modelBoundingBox);
        }
    }

    resize() {}

    update() {
        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
    }

    destroy() {}
}
