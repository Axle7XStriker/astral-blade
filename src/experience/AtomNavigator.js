import EventEmitter from "events";
import * as THREE from "three";

import Experience from "./Experience.js";
import { VIEWS } from "./configs.js";
import { max, avg, modulate, modulateSphericalGeometry } from "./utils/common.js";

/** A navigator in the form of an atom that can be used to view different aspects of the experience. */
export default class AtomNavigator extends EventEmitter {
    /**
     * @param {float} _options.nucleusRadius - radius of the atom's nucleus (default: 1.0).
     * @param {float} _options.electronNucleusSizeRatio - ratio of the radius of electron to the radius of nucleus (default: 0.2).
     */
    constructor(_options = {}) {
        // Constants
        super();
        this.experience = new Experience();
        this.camera = this.experience.mainCamera;
        this.scene = this.experience.scene;
        this.sizes = this.experience.sizes;
        this.time = this.experience.time;
        this.debug = this.experience.debug;
        this.audioManager = this.experience.audioManager;
        this.interactiveControls = this.experience.interactiveControls;

        this.nucleusRadius = _options.nucleusRadius || 1.0;
        this.electronNucleusSizeRatio = _options.electronNucleusSizeRatio || 0.2;
        this.debugParams = { nucleusColor: 0x68c3c0, electronColor: 0x68c3c0 };

        this.init();
    }

    init() {
        // Debug GUI
        if (this.debug) {
            this.debugFolder = this.debug.addFolder("AtomNavigator");
        }

        this.setMouseRaycaster();

        this.modelView = new THREE.Group();
        this.modelView.add(this.createAtomViewer());

        this.setDebugEnvironment();
    }

    /**
     * Creates atom navigator's three.js model view.
     * The model's center is positioned at (0, 0, 0) in the 3d coordinate system.
     */
    createAtomViewer() {
        this.atom = new THREE.Group();

        this.nucleus = createSphere({
            radius: this.nucleusRadius,
            color: this.debugParams.nucleusColor,
        });
        this.nucleus.material.wireframe = true;
        this.atom.add(this.nucleus);

        this.electrons = new THREE.Group();
        this.electronsConfig = {};
        Object.keys(VIEWS).forEach((viewKey) => {
            // Value of ellipse's radii varies from nucleusRadius(x2.0) to nucleusRadius(x3.0).
            const a = this.nucleusRadius * 2.0 + Math.random() * this.nucleusRadius * 1.0;
            const b = this.nucleusRadius * 2.0 + Math.random() * this.nucleusRadius * 1.0;
            const theta = Math.random() * 2 * Math.PI;

            // Used to rotate the 2d ellipse along x, y and z axes (in this order).
            const rotateX = Math.random() * 2 * Math.PI;
            const rotateY = Math.random() * 2 * Math.PI;
            const rotateZ = Math.random() * 2 * Math.PI;

            // Spawn the elliptical orbit on which the electron will revolve around the nucleus.
            const orbit = createEllipse({
                a,
                b,
                rotateX,
                rotateY,
                rotateZ,
            });

            // Spawn the electron sphere on the elliptical orbit on the position specified by the above parameters.
            const position = compute3DEllipseCoordinates({
                a,
                b,
                theta,
                rotateX,
                rotateY,
                rotateZ,
            });
            const electron = createSphere({
                radius: this.nucleusRadius * this.electronNucleusSizeRatio,
                color: this.debugParams.electronColor,
                x: position.x,
                y: position.y,
                z: position.z,
            });

            // An electron will consists multiple spheres of gradually decreasing sizes positioned
            // very close to each other in the order of decreasing size so as to create an effect of
            // a moving electron with a light tail when animating its revolution around the nucleus.
            const electronOrbit = new THREE.Group();
            const electronTrail = new THREE.Group();
            electronTrail.add(electron);
            electronOrbit.add(electronTrail).add(orbit);
            this.objectsToCheck.push(electronTrail);
            // Rotate the electron's orbit (ellipse), so that its plane coincides with the plane obtained
            // by rotating the x-y plane along the x, y and z axes (in this order).
            electronOrbit.rotation.set(rotateX, rotateY, rotateZ);

            this.electrons.add(electronOrbit);
            this.electronsConfig[electronTrail.uuid] = {
                a,
                b,
                theta,
                rotateX,
                rotateY,
                rotateZ,
                viewKey,
            };
        });
        this.atom.add(this.electrons);

        if (this.debug) {
            this.debugFolder.addColor(this.debugParams, "nucleusColor").onChange(() => {
                this.nucleus.material.color.set(this.debugParams.nucleusColor);
            });
            // this.debugFolder.addColor(this.debugParams, "electronColor").onChange(() => {
            //     this.electronSpheres.forEach((electron) => {
            //         electron.material.color.set(this.debugParams.electronColor);
            //     });
            // });
        }
        this.electronHighlighter = new THREE.Mesh(
            new THREE.RingBufferGeometry(
                this.nucleusRadius * this.electronNucleusSizeRatio + 0.04,
                this.nucleusRadius * this.electronNucleusSizeRatio + 0.05,
                32
            ),
            this.nucleus.material
        );

        return this.atom;
    }

    setMouseRaycaster() {
        this.raycaster = this.interactiveControls.raycaster;
        this.objectsToCheck = [];
        this.currentIntersect = null;
    }

    setDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xffff00);
            this.modelView.add(modelBoundingBox);
        }
    }

    set() {
        this.#addListeners();
    }

    #addListeners() {
        this.handlerInteractiveUp = this.#onInteractiveUp.bind(this);

        this.interactiveControls.addListener("interactive-up", this.handlerInteractiveUp);
        this.interactiveControls.objectsToCheck.push(...this.objectsToCheck);
        this.interactiveControls.enable();
    }

    clear() {
        this.#removeListeners();
        this.scene.remove(this.electronHighlighter);
    }

    #removeListeners() {
        this.interactiveControls.removeListener("interactive-up", this.handlerInteractiveUp);

        this.objectsToCheck.forEach((objToRemove) => {
            const index = this.interactiveControls.objectsToCheck.findIndex(
                (obj) => obj === objToRemove
            );
            this.interactiveControls.objectsToCheck.splice(index, 1);
        });
        this.interactiveControls.disable();
    }

    /**
     * Checks for the electron that was clicked upon and emits a "change-view" signal with the
     * appropriate view requested by the user.
     */
    #onInteractiveUp(e) {
        if (this.currentIntersect !== null) {
            const selectedElectronUuid = Object.keys(this.electronsConfig).find((uuid) => {
                const electronTrail = this.electrons.getObjectByProperty("uuid", uuid);
                return (
                    electronTrail.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                    undefined
                );
            });
            this.emit("change-view", {
                viewKey: this.electronsConfig[selectedElectronUuid].viewKey,
            });
        }
    }

    /**
     * Updates atom navigator's three.js model view.
     * The nucleus remains static while the electrons revolve around it in concentric elliptical orbits.
     */
    update() {
        // Visualize audio by modifying nucleus' geometry.
        this.updateNucleus(this.audioManager.getAudioData());

        // Check if the mouse is hovering over any electron sphere and prevent it from rotating
        // around the nucleus.
        this.updateMouseRaycaster();

        // Handle electron revolution around the nucleus and mouse interaction.
        this.updateElectrons();
    }

    /**
     * Makes the electrons revolve around the nucleus, prevent any electron from revolving
     * that is being hovered over, and show additional animations like a revolving electron's
     * tail, highlighting a static electron, etc.
     */
    updateElectrons() {
        this.scene.remove(this.electronHighlighter);
        // Make electron(s) revolve around the nucleus.
        Object.keys(this.electronsConfig).forEach((uuid) => {
            const electronTrail = this.electrons.getObjectByProperty("uuid", uuid);
            // Specially handle the electron being hovered over.
            if (
                this.currentIntersect !== null &&
                electronTrail.getObjectByProperty("uuid", this.currentIntersect.object.uuid) !==
                    undefined
            ) {
                // Prevent the last introduced electron sphere from decaying, others decay faster than normal.
                electronTrail.children.forEach((elec, idx) => {
                    if (idx === electronTrail.children.length - 1) return;
                    elec.scale.multiplyScalar(0.5);
                    if ((elec.scale.x < 0.01, elec.scale.y < 0.01, elec.scale.z < 0.01)) {
                        electronTrail.remove(elec);
                    }
                });

                // Add a ring around the electron being hovered over to highlight it to the user.
                if (electronTrail.children.length === 1) {
                    this.electronHighlighter.position.setFromMatrixPosition(
                        electronTrail.children[0].matrixWorld
                    );
                    this.electronHighlighter.scale.setFromMatrixScale(
                        electronTrail.children[0].matrixWorld
                    );
                    this.scene.add(this.electronHighlighter);
                }
                return;
            }
            // Decrease the size of each sphere associated with an electron and
            // remove those that would not be visible to the human eye.
            electronTrail.children.forEach((elec) => {
                elec.scale.multiplyScalar(0.95);
                if ((elec.scale.x < 0.01, elec.scale.y < 0.01, elec.scale.z < 0.01)) {
                    electronTrail.remove(elec);
                }
            });

            // Add another sphere to the electron at the next position where the
            // electron should visit while revolving around the nucleus.
            this.electronsConfig[uuid].theta += this.time.delta * 0.00025;
            const position = compute3DEllipseCoordinates(this.electronsConfig[uuid]);
            const electron = createSphere({
                color: this.debugParams.electronColor,
                x: position.x,
                y: position.y,
                z: position.z,
                geometry: electronTrail.children[0].geometry,
                material: electronTrail.children[0].material,
            });
            electronTrail.add(electron);
        });
    }

    /** Updates nucleus' geometry as per the playing audio. */
    updateNucleus(audioData) {
        if (audioData === undefined) return;

        // slice the array into two halves
        var lowerHalfArray = audioData.slice(0, audioData.length / 2 - 1);
        var upperHalfArray = audioData.slice(audioData.length / 2 - 1, audioData.length - 1);

        // do some basic reductions/normalisations
        var lowerMax = max(lowerHalfArray);
        var lowerAvg = avg(lowerHalfArray);
        var upperMax = max(upperHalfArray);
        var upperAvg = avg(upperHalfArray);

        var lowerMaxFr = lowerMax / lowerHalfArray.length;
        var lowerAvgFr = lowerAvg / lowerHalfArray.length;
        var upperMaxFr = upperMax / upperHalfArray.length;
        var upperAvgFr = upperAvg / upperHalfArray.length;

        // This modulates the icosahedron's shape.
        modulateSphericalGeometry(
            this.nucleus,
            modulate(Math.pow(lowerMaxFr, 0.5), 0, 1, 0, 0.2),
            modulate(upperAvgFr, 0, 1, 0, 0.1)
        );
    }

    /**
     * Check for any pointer-based events that might have occurred due to the intersection of
     * mouse pointer with the electrons.
     */
    updateMouseRaycaster() {
        // Check if the pointer is intersecting with any electron. If it is, then stop and highlight it.
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

    resize() {}

    destroy() {}
}

/** Helpers **/

/**
 * Creates a sphere using the @type {THREE.MeshPhongMaterial}.
 * @param {float} _options.radius - radius of the sphere (default: 1.0).
 * @param {(THREE.Color|string|hexadecimal)} _options.color - color of the sphere (default: 0x68c3c0).
 * @param {float} _options.x - x-coordinate of the sphere (default: 0).
 * @param {float} _options.y - y-coordinate of the sphere (default: 0).
 * @param {float} _options.z - z-coordinate of the sphere (default: 0).
 * @param {THREE.SphereBufferGeometry} geometry - geometry of which the sphere should be made up of (default: THREE.SphereBufferGeometry).
 * @param {THREE.MeshBasicMaterial} material - material of which the sphere should be made up of (default: THREE.MeshBasicMaterial).
 * @returns {THREE.Mesh}
 */
function createSphere(_options = {}) {
    const geometry =
        _options.geometry || new THREE.SphereBufferGeometry(_options.radius || 1.0, 64, 64);
    const material =
        _options.material ||
        new THREE.MeshBasicMaterial({
            color: _options.color || 0x68c3c0,
            transparent: true,
            opacity: 0.8,
        });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.x = _options.x || 0;
    sphere.position.y = _options.y || 0;
    sphere.position.z = _options.z || 0;

    return sphere;
}

/**
 * Creates an ellipse in the x-y plane using the @type {THREE.LineBasicMaterial}.
 * @param {float} _options.a - radius of the ellipse along the x-axis.
 * @param {float} _options.b - radius of the ellipse along the y-axis.
 * @param {(THREE.Color|string|hexadecimal)} _options.color - color of the sphere (default: 0x68c3c0).
 * @returns {THREE.Mesh}
 */
function createEllipse(_options = {}) {
    if (_options.a === undefined || _options.b === undefined) {
        throw new Error("Missing necessary arguments: a, b.");
    }

    const curve = new THREE.EllipseCurve(
        0, // ax
        0, // aY
        _options.a, // xRadius
        _options.b, // yRadius
        0, // aStartAngle
        2 * Math.PI, // aEndAngle
        false, // aClockwise
        0 // aRotation
    );

    const pointsOnCurve = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(pointsOnCurve);
    const material = new THREE.LineBasicMaterial({
        color: _options.color || 0x68c3c0,
        transparent: true,
        opacity: 0.1,
    });

    const ellipse = new THREE.Line(geometry, material);

    return ellipse;
}

/**
 * Compute a point's coordinates on an ellipse in the x-y plane.
 * @param {float} _options.a - radius of the ellipse along the x-axis.
 * @param {float} _options.b - radius of the ellipse along the y-axis.
 * @param {float} _options.theta - angle that the point makes with the positive x-axis in counter-clockwise direction.
 * @returns {THREE.Vector3}
 */
function compute3DEllipseCoordinates(_options = {}) {
    if (_options.a === undefined || _options.b === undefined || _options.theta === undefined) {
        throw new Error("Missing necessary arguments: a, b, theta.");
    }

    // 2d elliptical coordinates.
    const ellipseX = _options.a * Math.cos(_options.theta);
    const ellipseY = _options.b * Math.sin(_options.theta);

    // 3d elliptical coordinates.
    const position = new THREE.Vector3(ellipseX, ellipseY, 0);

    return position;
}
