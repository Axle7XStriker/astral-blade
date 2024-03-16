import EventEmitter from "events";
import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

import Experience from "./Experience.js";
import { convertShapePathsToBufferGeometry } from "./utils/common.js";

/** A heads-up display (HUD) for displaying data that is independent of viewpoint. */
export default class HUD extends EventEmitter {
    constructor(_options = {}) {
        super();
        this.experience = new Experience();
        this.camera = this.experience.mainCamera;
        this.resources = this.experience.resources;
        this.interactiveControls = this.experience.interactiveControls;

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
        this.modelView.add(this.#createHudBoundary());
        this.feedbackIcon = this.#createFeedbackIcon();
        this.modelView.add(this.feedbackIcon);

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
        // All HUD elements need to remain fixed in their specified position irrespective of camera position.
        material.onBeforeCompile = function (shader) {
            shader.vertexShader = shader.vertexShader.replace(
                `#include <project_vertex>`,
                `
                    #include <project_vertex>
                    gl_Position = vec4( transformed, 1.0 );
                `
            );
        };

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
        // hudBoundary.position.set(0, 0, 1).unproject(this.camera.instance);

        return hudBoundary;
    }

    #createFeedbackIcon() {
        const feedbackIcon = new THREE.Group();

        const planeGeometry = new THREE.PlaneGeometry(0.3, 0.1);
        const innerIconBoundaryGeometry = new THREE.EdgesGeometry(planeGeometry);
        planeGeometry.applyMatrix4(new THREE.Matrix4().makeScale(1.05, 1.15, 1));
        const outerIconBoundaryGeometry = new THREE.EdgesGeometry(planeGeometry);

        const iconBoundaryMaterial = new THREE.LineBasicMaterial({ color: 0x67c7eb });
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
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0x67c7eb).convertSRGBToLinear(),
            opacity: 0.0,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            // wireframe: true,
        });
        const feedbackIconSvg = new THREE.Mesh(pathGeometry, material);
        feedbackIcon.add(feedbackIconSvg);
        const planeMesh = new THREE.Mesh(planeGeometry, mat);
        feedbackIcon.add(planeMesh);
        this.objectsToCheck.push(planeMesh);

        // All HUD elements need to remain fixed in their specified position irrespective of camera position.
        feedbackIcon.position.set(1.05, -0.75, 0).unproject(this.camera.instance);

        return feedbackIcon;
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

        this.interactiveControls.addListener("interactive-up", this.handlerInteractiveUp);
        // this.interactiveControls.objectsToCheck.push(...this.objectsToCheck);
        this.interactiveControls.enable();
    }

    clear() {
        this.#removeListeners();
    }

    addFeedbackIcon() {
        this.modelView.add(this.feedbackIcon);
    }

    removeFeedbackIcon() {
        this.modelView.remove(this.feedbackIcon);
    }

    #removeListeners() {
        this.interactiveControls.removeListener("interactive-up", this.handlerInteractiveUp);

        this.objectsToCheck.forEach((objToRemove) => {
            const index = this.interactiveControls.objectsToCheck.findIndex(
                (obj) => obj === objToRemove
            );
            this.interactiveControls.objectsToCheck.splice(index, 1);
        });
        // this.interactiveControls.disable();
    }

    /**
     * Checks for the electron that was clicked upon and emits a "change-view" signal with the
     * appropriate view requested by the user.
     */
    #onInteractiveUp(e) {
        if (
            this.currentIntersect !== null &&
            this.feedbackIcon.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                undefined
        ) {
            console.log("open-feedback");
            this.emit("open-feedback", {
                viewKey: "feedback",
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
        if (this.feedbackIcon) {
            // Update feedback icon's boundary when hovered upon
            if (
                this.currentIntersect !== null &&
                this.feedbackIcon.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                    undefined
            ) {
                this.feedbackIcon.children[0].children.forEach((child, idx) => {
                    child.material.color.setHex(0x003144);
                });
            } else {
                this.feedbackIcon.children[0].children.forEach((child, idx) => {
                    child.material.color.setHex(0x67c7eb);
                });
            }
        }
    }

    resize() {
        this.feedbackIcon.position.set(1.05, -0.75, 0).unproject(this.camera.instance);
    }
}
