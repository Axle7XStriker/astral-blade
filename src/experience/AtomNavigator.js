import * as THREE from "three";

import Experience from "./Experience.js";
import { max, avg, modulate, modulateSphericalGeometry } from "./utils/common.js";

/** A navigator in the form of an atom that can be used to view different aspects of the experience. */
export default class AtomNavigator {
    /**
     * @param {float} _options.nucleusRadius - radius of the atom's nucleus (default: 1.0).
     * @param {int} _options.electronCount - number of electrons that will revolve around the nucleus (default: 0).
     * @param {float} _options.electronNucleusSizeRatio - ratio of the radius of electron to the radius of nucleus (default: 0.2).
     */
    constructor(_options = {}) {
        // Constants
        this.experience = new Experience();
        this.camera = this.experience.camera;
        this.sizes = this.experience.sizes;
        this.debug = this.experience.debug;
        this.audioManager = this.experience.audioManager;

        this.nucleusRadius = _options.nucleusRadius || 1.0;
        this.electronCount = _options.electronCount || 0;
        this.electronNucleusSizeRatio = _options.electronNucleusSizeRatio || 0.2;
        this.debugParams = { nucleusColor: 0x68c3c0, electronColor: 0x68c3c0 };

        // Debug GUI
        if (this.debug) {
            this.debugFolder = this.debug.addFolder("AtomNavigator");
        }

        this.modelView = new THREE.Group();
        this.modelView.add(this.createAtomViewer());

        this.setMouseRaycaster();
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
        this.electronSpheres = [];
        this.electronsConfig = {};
        for (let i = 0; i < this.electronCount; i++) {
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

            // Spawn the electron on the elliptical orbit on the position specified by the above parameters.
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

            const electronOrbit = new THREE.Group();
            electronOrbit.add(electron).add(orbit);
            this.electronSpheres.push(electron);
            // Rotate the electron's orbit (ellipse), so that its plane coincides with the plane obtained
            // by rotating the x-y plane along the x, y and z axes (in this order).
            electronOrbit.rotation.set(rotateX, rotateY, rotateZ);

            this.electrons.add(electronOrbit);
            this.electronsConfig[electron.uuid] = { a, b, theta, rotateX, rotateY, rotateZ };
        }
        this.atom.add(this.electrons);

        if (this.debug) {
            this.debugFolder.addColor(this.debugParams, "nucleusColor").onChange(() => {
                this.nucleus.material.color.set(this.debugParams.nucleusColor);
            });
            this.debugFolder.addColor(this.debugParams, "electronColor").onChange(() => {
                this.electronSpheres.forEach((electron) => {
                    electron.material.color.set(this.debugParams.electronColor);
                });
            });
        }

        return this.atom;
    }

    setMouseRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.currentIntersect = null;

        this.mouse = new THREE.Vector2();
        document.addEventListener("mousemove", (event) => {
            this.mouse.x = (event.clientX / this.sizes.width) * 2 - 1;
            this.mouse.y = -(event.clientY / this.sizes.height) * 2 + 1;
        });
    }

    setDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xffff00);
            this.modelView.add(modelBoundingBox);
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

        // Make electron(s) revolve around the nucleus.
        Object.keys(this.electronsConfig).forEach((uuid) => {
            if (this.currentIntersect !== null && this.currentIntersect.object.uuid === uuid)
                return;

            this.electronsConfig[uuid].theta += 0.005;
            const position = compute3DEllipseCoordinates(this.electronsConfig[uuid]);
            const electron = this.electrons.getObjectByProperty("uuid", uuid);
            electron.position.set(position.x, position.y, position.z);
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

    updateMouseRaycaster() {
        // Cast a ray from the mouse and handle events.
        this.raycaster.setFromCamera(this.mouse, this.camera.instance);

        const intersects = this.raycaster.intersectObjects(this.electronSpheres);
        if (intersects.length) {
            if (this.currentIntersect === null) {
                this.currentIntersect = intersects[0];
            }
        } else {
            this.currentIntersect = null;
        }
    }
}

/** Helpers **/

/**
 * Creates a sphere using the @type {THREE.MeshPhongMaterial}.
 * @param {float} _options.radius - radius of the sphere (default: 1.0).
 * @param {(THREE.Color|string|hexadecimal)} _options.color - color of the sphere (default: 0x68c3c0).
 * @param {float} _options.x - x-coordinate of the sphere (default: 0).
 * @param {float} _options.y - y-coordinate of the sphere (default: 0).
 * @param {float} _options.z - z-coordinate of the sphere (default: 0).
 * @returns {THREE.Mesh}
 */
function createSphere(_options = {}) {
    const geometry = new THREE.SphereBufferGeometry(_options.radius || 1.0, 64, 64);
    const material = new THREE.MeshBasicMaterial({
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
    const material = new THREE.LineBasicMaterial({ color: _options.color || 0x68c3c0 });

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
