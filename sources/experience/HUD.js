import * as THREE from "three";

import Experience from "./Experience.js";
import { convertShapePathsToBufferGeometry } from "./utils/common.js";

/** A heads-up display (HUD) for displaying data that is independent of viewpoint. */
export default class HUD extends THREE.EventDispatcher {
    constructor(_options = {}) {
        super();
        this.experience = new Experience();
        this.camera = this.experience.mainCamera;
        this.resources = this.experience.resources;
        this.interactiveControls = this.experience.interactiveControls;
        this.sizes = this.experience.sizes;

        this.init();
    }

    init() {
        this.setMouseRaycaster();

        this.modelView = new THREE.Group();
        this.resources.on("groupEnd", (_group) => {
            if (_group.name === "HUD") {
                this.createHudOverlay();
            }
        });
    }

    /**
     * Creates HUD's three.js overlay (model view).
     * The model's center is positioned at (0, 0, 0) in the 3d coordinate system.
     */
    createHudOverlay() {
        // this.modelView.add(this.#createDisplayPlane());
        this.hudBoundary = this.#createHudBoundary();
        this.modelView.add(this.hudBoundary);

        this.feedbackIcon = this.#createFeedbackIcon();
        this.modelView.add(this.feedbackIcon);

        this.backIndicator = this.#createBackIndicator();

        this.camera.focusCamera(this.hudBoundary, 1);

        return this.hudOverlay;
    }

    /** Creates a glass plane that will act like a display pane on which information is rendered. */
    #createDisplayPlane() {
        const geometry = new THREE.PlaneBufferGeometry(2, 2, 1, 1);
        const material = new THREE.ShaderMaterial({
            // wireframe: true,
            transparent: true,
            uniforms: {
                uAlpha: { value: 0.1 },
            },
            // Need to keep the display pane fixed in a particular position irrespective of camera
            // position as it needs to look like that the scene is being rendered on it.
            vertexShader: `
                void main() {
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uAlpha;
        
                void main() {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
                }
            `,
        });
        const displayPane = new THREE.Mesh(geometry, material);

        return displayPane;
    }

    /**
     * Serves as the boundary of the display pane within which everything is rendered but
     * beyond and on which nothing is rendered at all.
     */
    #createHudBoundary() {
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x67c7eb).convertSRGBToLinear(),
            opacity: 0.6,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            // wireframe: true,
        });

        // Iterate through all the paths and their sub-paths to obtain their respective geometries.
        const paths = this.resources.items.hudBoundary.paths;
        const pathGeometry = convertShapePathsToBufferGeometry(paths);

        // Since the SVG is created on a grid where positive y-axis is downwards, and not in
        // Normalized Device Coordinates (NDC), below transformations fix that.
        pathGeometry.computeBoundingBox();
        let boundingBox = pathGeometry.boundingBox;
        let size = boundingBox.getSize(new THREE.Vector3());
        const positions = pathGeometry.getAttribute("position").array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = -(((positions[i] - boundingBox.min.x) * 2) / size.x - 1);
            positions[i + 1] = -(((positions[i + 1] - boundingBox.min.y) * 2) / size.y - 1);
        }

        const hudBoundary = new THREE.Mesh(pathGeometry, material);

        hudBoundary.geometry.scale(this.camera.instance.aspect, 1, 1);
        this.currentScale = this.camera.instance.aspect;
        hudBoundary.position.set(0, 0, 2.5);

        return hudBoundary;
    }

    #createFeedbackIcon() {
        const feedbackIcon = new THREE.Group();

        const planeGeometry = new THREE.PlaneGeometry(0.3, 0.1);
        const innerIconBoundaryGeometry = new THREE.EdgesGeometry(planeGeometry);
        planeGeometry.applyMatrix4(new THREE.Matrix4().makeScale(1.05, 1.15, 1));
        const outerIconBoundaryGeometry = new THREE.EdgesGeometry(planeGeometry);
        const iconBoundaryMaterial = new THREE.LineBasicMaterial({ color: 0x003144 });
        const innerIconBoundary = new THREE.LineSegments(
            innerIconBoundaryGeometry,
            iconBoundaryMaterial
        );
        const outerIconBoundary = new THREE.LineSegments(
            outerIconBoundaryGeometry,
            iconBoundaryMaterial
        );
        const iconBoundary = new THREE.Group().add(innerIconBoundary, outerIconBoundary);
        feedbackIcon.add(iconBoundary);

        const paths = this.resources.items.feedbackIcon.paths;
        const pathGeometry = convertShapePathsToBufferGeometry(paths);
        // Since the SVG is created on a grid where positive y-axis is downwards, and not in
        // Normalized Device Coordinates (NDC), below transformations fix that and put it at the
        // appropriate place.
        pathGeometry.computeBoundingBox();
        let boundingBox = pathGeometry.boundingBox;
        let size = boundingBox.getSize(new THREE.Vector3());
        const positions = pathGeometry.getAttribute("position").array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = -(((positions[i] - boundingBox.min.x) * 0.1) / size.x + 0.05);
            positions[i + 1] = -(((positions[i + 1] - boundingBox.min.y) * 0.1) / size.y - 0.05);
        }
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x67c7eb).convertSRGBToLinear(),
            opacity: 0.5,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            // wireframe: true,
        });
        const feedbackIconSvg = new THREE.Mesh(pathGeometry, material);
        feedbackIcon.add(feedbackIconSvg);

        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x003144).convertSRGBToLinear(),
            opacity: 0.0,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            // wireframe: true,
        });
        const planeMesh = new THREE.Mesh(planeGeometry, mat);
        feedbackIcon.add(planeMesh);
        this.objectsToCheck.push(planeMesh);

        // All HUD elements need to remain fixed in their specified position irrespective of camera position.
        feedbackIcon.position.set(
            (this.sizes.width / this.sizes.height * 1.01), 
            -0.8, 
            2.5
        );

        return feedbackIcon;
    }

    #createBackIndicator() {
        const backIndicator = new THREE.Group();

        const paths = this.resources.items.backIndicator.paths;
        const pathGeometry = convertShapePathsToBufferGeometry(paths);
        // Since the SVG is created on a grid where positive y-axis is downwards, and not in
        // Normalized Device Coordinates (NDC), below transformations fix that and put it at the
        // appropriate place.
        pathGeometry.computeBoundingBox();
        let boundingBox = pathGeometry.boundingBox;
        let center = boundingBox.getCenter(new THREE.Vector3());
        let size = boundingBox.getSize(new THREE.Vector3());
        const positions = pathGeometry.getAttribute("position").array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = (((positions[i] - boundingBox.min.x) * 0.1) / size.x + 0.05);
            positions[i + 1] = -(((positions[i + 1] - boundingBox.min.y) * 0.1) / size.y - 0.05);
        }
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x003144).convertSRGBToLinear(),
            opacity: 0.5,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        const backIndicatorSvg = new THREE.Mesh(pathGeometry, material);
        backIndicator.add(backIndicatorSvg);

        const planeGeometry = new THREE.PlaneGeometry(0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x003144).convertSRGBToLinear(),
            opacity: 0.0,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            // wireframe: true,
        });
        const planeMesh = new THREE.Mesh(planeGeometry, mat);
        center.x = (((center.x - boundingBox.min.x) * 0.1) / size.x + 0.05);
        center.y = -(((center.y - boundingBox.min.y) * 0.1) / size.y - 0.05);
        planeMesh.position.set(center.x, center.y, center.z);
        backIndicator.add(planeMesh);
        this.objectsToCheck.push(planeMesh);

        // All HUD elements need to remain fixed in their specified position irrespective of camera position.
        if (this.sizes.width >= this.sizes.height) {
            backIndicator.position.set(
                (this.sizes.width / this.sizes.height * 0.85), 
                0.8, 
                2.5
            );
        } else {
            backIndicator.position.set(
                (this.sizes.width / this.sizes.height * 0.65), 
                0.8, 
                2.5
            );
        }

        return backIndicator;
    }

    updateHudFooterText(text) {
        const hudFooterTextElement = document.getElementById("hud-footer-text");
        if (hudFooterTextElement) {
            hudFooterTextElement.textContent = text;
        }
    }

    setMouseRaycaster() {
        this.raycaster = this.interactiveControls.raycaster;
        this.objectsToCheck = [];
        this.currentIntersect = null;
    }

    set() {
        this.#addListeners();
    }

    #addListeners() {
        this.handlerInteractiveUp = this.#onInteractiveUp.bind(this);

        this.interactiveControls.addEventListener("interactive-up", this.handlerInteractiveUp);
        this.interactiveControls.enable();
    }

    clear() {
        this.#removeListeners();
    }

    addFeedbackIcon() {
        if (this.feedbackIcon) {
            this.modelView.add(this.feedbackIcon);
        }
    }

    removeFeedbackIcon() {
        if (this.feedbackIcon) {
            this.modelView.remove(this.feedbackIcon);
        }
    }

    addBackIndicator() {
        if (this.backIndicator) {
            this.modelView.add(this.backIndicator);
        }
    }

    removeBackIndicator() {
        if (this.backIndicator) {
            this.modelView.remove(this.backIndicator);
        }
    }

    #removeListeners() {
        this.interactiveControls.removeEventListener("interactive-up", this.handlerInteractiveUp);

        this.objectsToCheck.forEach((objToRemove) => {
            const index = this.interactiveControls.objectsToCheck.findIndex(
                (obj) => obj === objToRemove
            );
            this.interactiveControls.objectsToCheck.splice(index, 1);
        });
        // this.interactiveControls.disable();
    }

    /**
     * Checks if a hud element was clicked upon and emits the appropriate event.
     */
    #onInteractiveUp(e) {
        if (
            this.currentIntersect !== null &&
            this.feedbackIcon.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                undefined
        ) {
            // Checks if the feedback icon was clicked upon and emits an "open-feedback" signal with the
            // "feedback" as the view key.
            console.log("open-feedback");
            this.dispatchEvent({
                type: "open-feedback", 
                viewKey: "feedback",
            });
        } else if (
            this.currentIntersect !== null &&
            this.backIndicator.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                undefined
        ) {
            // Checks if the back indicator icon was clicked upon and emits a "change-view" 
            // signal with the "home" as the view key.
            this.removeBackIndicator();
            this.dispatchEvent({
                type: "change-view",
                viewKey: "home",
            });
        }
    }

    /**
     * Updates HUD's three.js model view.
     */
    update() {
        // Check if the mouse is hovering over any electron sphere and prevent it from rotating
        // around the nucleus.
        this.updateMouseRaycaster();

        this.updateFeedbackIcon();

        this.updateBackIndicator();
    }

    /**
     * Check for any pointer-based events that might have occurred due to the intersection of
     * mouse pointer with the HUD elements.
     */
    updateMouseRaycaster() {
        // Check if the pointer is intersecting with any HUD element. If it is, then highlight it.
        const intersects = this.raycaster.intersectObjects(this.objectsToCheck);
        if (intersects.length) {
            // If an electron is already being hovered over, then don't overwrite it.
            if (this.currentIntersect === null) {
                this.currentIntersect = intersects[0];
            }
        } else {
            this.currentIntersect = null;
        }
    }

    updateFeedbackIcon() {
        if (this.feedbackIcon && this.modelView.getObjectByProperty("uuid", this.feedbackIcon.uuid) !== undefined) {
            // Update feedback icon's boundary when hovered upon
            if (
                this.currentIntersect !== null &&
                this.feedbackIcon.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                    undefined
            ) {
                this.feedbackIcon.children[0].children.forEach((child, idx) => {
                    child.material.color.setHex(0x67c7eb);
                });
                this.updateHudFooterText("Click to provide feedback");
            } else {
                this.feedbackIcon.children[0].children.forEach((child, idx) => {
                    child.material.color.setHex(0x003144);
                });
            }
        }
    }

    updateBackIndicator() {
        if (this.backIndicator && this.modelView.getObjectByProperty("uuid", this.backIndicator.uuid) !== undefined) {
            // Update feedback icon's boundary when hovered upon
            if (
                this.currentIntersect !== null &&
                this.backIndicator.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                    undefined
            ) {
                this.backIndicator.children[0].material.color.setHex(0x67c7eb);
                this.updateHudFooterText("Click to go back to Home screen");
            } else {
                this.backIndicator.children[0].material.color.setHex(0x003144);
            }
        }
    }

    resize() {
        this.hudBoundary.geometry.scale(this.camera.instance.aspect / this.currentScale, 1, 1);
        this.currentScale = this.camera.instance.aspect;
        this.hudBoundary.position.set(0, 0, 2.5);
        this.camera.focusCamera(this.hudBoundary, 1);

        if (this.feedbackIcon) {
            this.feedbackIcon.position.set(
                (this.sizes.width / this.sizes.height * 1.01), 
                -0.8, 
                2.5
            );
        }
        if (this.backIndicator) {
            if (this.sizes.width >= this.sizes.height) {
                this.backIndicator.position.set(
                    (this.sizes.width / this.sizes.height * 0.85), 
                    0.8, 
                    2.5
                );
            } else {
                this.backIndicator.position.set(
                    (this.sizes.width / this.sizes.height * 0.65), 
                    0.8, 
                    2.5
                );
            }
        }
    }
}
