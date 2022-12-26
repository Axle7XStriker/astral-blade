import * as THREE from "three";

import AboutMe from "./AboutMe.js";
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

        this.currentViewType = "";
        this.currentView = null;
        this.setupViews();
        this.setView("home");

        this.#addListeners();
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

    setupViews() {
        this.views = {
            aboutMe: new AboutMe(),
        };
        this.views["home"] = new Home({ numViews: Object.keys(this.views).length });
    }

    setView(viewType) {
        if (viewType === undefined || !(viewType in this.views)) {
            console.warn("Undefined/Unsupported view type passed as an argument.");
            return;
        }
        if (this.currentViewType !== "") {
            this.currentView.clear();

            const index = this.subjects.findIndex((obj) => obj === this.currentView);
            this.subjects.splice(index, 1);
        }
        this.currentViewType = viewType;
        this.currentView = this.views[viewType];
        this.subjects.push(this.currentView);
        this.currentView.set();

        if (viewType !== "home") {
            this.#includeBackIndicator();
        }
        console.log(this.subjects);
    }

    #includeBackIndicator() {
        const backIndicator = document.querySelector("#back-indicator");
        backIndicator.classList.remove("hide");
        backIndicator.classList.add("show");
        backIndicator.addEventListener("click", () => {
            backIndicator.classList.remove("show");
            backIndicator.classList.add("hide");

            this.setView("home");
        });
    }

    resize() {
        this.subjects.forEach((obj) => {
            if (typeof obj.resize === "function") {
                obj.resize();
            }
        });
    }

    update() {
        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
    }

    #addListeners() {
        this.handlerChangeView = this.onChangeView.bind(this);

        this.views["home"].atomNavigator.addListener("change-view", this.handlerChangeView);
    }

    onChangeView(e) {
        // console.log("Change View Called:", e);
        this.setView(e.viewKey);
    }

    destroy() {}
}
