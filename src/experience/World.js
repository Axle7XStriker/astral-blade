import * as THREE from "three";

import Experience from "./Experience.js";
import Home from "./Home.js";
import HUD from "./HUD.js";
import VirtualAssistant from "./VirtualAssistant.js";

/**
 * High-level logical component that encompass all the subjects inside the scene (seen/unseen).
 * It can be viewed as the root of a tree with all the other nodes being the subjects.
 */
export default class World {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.config = this.experience.config;
        this.scene = this.experience.scene;

        // Spawn all the subjects.
        this.subjects = []; // A collection of all the spawned subjects.
        // this.setVirtualAssistant();
        this.setHUD();

        this.setViews();
    }

    setDebugEnvironment() {
        if (this.config.debug) {
            const axesHelper = new THREE.AxesHelper(50);

            const gridHelper = new THREE.GridHelper(20, 20);
            // gridHelper.rotateX(Math.PI / 2);

            this.scene.add(gridHelper, axesHelper);
        }
    }

    setVirtualAssistant() {
        this.virtualAssistant = new VirtualAssistant();
        // console.log(this.virtualAssistant);

        this.scene.add(this.virtualAssistant.modelView);
        this.subjects.push(this.virtualAssistant);
    }

    setHUD() {
        this.hud = new HUD();
        // console.log(this.hud);

        this.scene.add(this.hud.modelView);
        this.subjects.push(this.hud);
    }

    setViews() {
        this.views = {
            home: new Home(),
        };
        this.setView("home");
    }

    setView(viewType) {
        if (viewType === undefined || !(viewType in this.views)) {
            console.warn("Undefined/Unsupported view type passed as an argument.");
            return;
        }
        this.currentViewType = viewType;
        this.currentView = this.views[viewType];
        this.subjects.push(this.currentView);
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
