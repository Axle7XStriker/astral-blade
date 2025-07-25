import * as THREE from "three";

import AboutMe from "./AboutMe.js";
import Experience from "./Experience.js";
import Home from "./Home.js";
import HUD from "./HUD.js";
import Music from "./Music.js";
import Fitness from "./Fitness.js";
import Fun from "./Fun.js";
import VirtualAssistant from "./VirtualAssistant.js";
import Work from "./Work.js";
import Feedback from "./Feedback.js";
import { VIEWS } from "./configs.js";

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

        this.hud.set();
    }

    setupViews() {
        this.views = {
            aboutMe: new AboutMe(),
            work: new Work(),
            music: new Music(),
            fitness: new Fitness(),
            fun: new Fun(),
            feedback: new Feedback(),
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
        this.currentView.resize();
        this.currentView.set();
        if (this.hud.hudBoundary) {
            this.experience.mainCamera.focusCamera(this.hud.hudBoundary, 1);
        }
        

        if (viewType !== "home") {
            this.hud.addBackIndicator();
        }
        if (viewType !== "feedback") {
            this.hud.addFeedbackIcon();
        }
        console.log(this.subjects);
    }

    resize() {
        this.subjects.forEach((obj) => {
            if (typeof obj.resize === "function") {
                obj.resize();
            }
        });
    }

    update() {
        this.hud.updateHudFooterText("");
        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
    }

    #addListeners() {
        this.handlerChangeView = this.onChangeView.bind(this);
        this.handlerElectronHovered = this.onElectronHovered.bind(this);
        this.handlerOpenFeedback = this.onOpenFeedback.bind(this);

        this.views["home"].atomNavigator.addListener("change-view", this.handlerChangeView);
        this.views["home"].atomNavigator.addListener("electron-hovered", this.handlerElectronHovered);
        this.hud.addListener("open-feedback", this.handlerOpenFeedback);
        this.hud.addListener("change-view", this.handlerChangeView);
    }

    onChangeView(e) {
        // console.log("Change View Called:", e);
        this.setView(e.viewKey);
    }

    onElectronHovered(e) {
        if (e === undefined || e.viewKey === undefined || !(e.viewKey in VIEWS)) {
            this.hud.updateHudFooterText("");
            return;
        }
        this.hud.updateHudFooterText( VIEWS[e.viewKey].footerText );
    }

    onOpenFeedback(e) {
        // console.log("Open Feedback Called:", e);
        this.setView(e.viewKey);
        this.hud.removeFeedbackIcon();
    }

    destroy() {}
}
