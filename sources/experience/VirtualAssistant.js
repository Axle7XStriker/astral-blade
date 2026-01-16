import * as THREE from "three";

import Experience from "./Experience.js";

/** A virtual/personal assistant (VA/PA) to help users navigate through the experience and act as a guide to them. */
export default class VirtualAssistant {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.time = this.experience.time;

        this.modelView = this.createAssistantAvatar();
    }

    /**
     * Creates virtual assistant's three.js avatar (model view).
     * The model's center is positioned at (0, 0, 0) in the 3d coordinate system.
     */
    createAssistantAvatar() {
        this.avatar = createSphereLineModel();
        this.experience.scene.add(new THREE.AmbientLight());

        return this.avatar;
    }

    update() {
        this.#animateSphereLineModel();
    }

    /** Animates the sphere line model by rotating each of its concentric spheres differently. */
    #animateSphereLineModel() {
        const time = this.time.current * 0.0001;

        this.avatar.children.forEach((object, idx) => {
            object.rotation.y = time * (idx + 1);
        });
    }
}

/** Helpers **/

/** Creates a line model consisting of multiple concentric sphere geometries. */
function createSphereLineModel() {
    const parameters = [
        { scaleFactor: 0.25, color: 0xff7700, opacity: 1.0 },
        { scaleFactor: 0.5, color: 0xff9900, opacity: 1.0 },
        { scaleFactor: 0.75, color: 0xffaa00, opacity: 0.75 },
        { scaleFactor: 1.0, color: 0xffcc00, opacity: 0.5 },
    ];

    const sphereLineModel = new THREE.Group();
    const sphereGeometry = createSphereGeometry({ vertexCount: 1500 });
    for (let i = 0; i < parameters.length; i++) {
        sphereLineModel.add(createLineModel(sphereGeometry, parameters[i]));
    }
    return sphereLineModel;
}

/**
 * Creates a line model of the given geometry.
 * @param {THREE.BufferGeometry} geometry - pair(s) of vertices representing each line segment(s).
 * @param {float} scaleFactor - factor by which the model is scaled along all the 3 axes (default: 1.0).
 * @param {(THREE.Color|string|hexadecimal)} _options.color - color of the line(s) (default: 0xff7700).
 * @param {float} _options.opacity - opacity (transparency) of the line(s) (default: 1.0).
 * @returns {THREE.LineSegments}
 */
function createLineModel(geometry, _options = {}) {
    if (!(geometry instanceof THREE.BufferGeometry)) return;

    const scaleFactor = _options.scaleFactor || 1.0;
    const color = _options.color || 0xff7700;
    const opacity = Math.max(Math.min(_options.opacity || 1.0, 1.0), 0.0);

    const material = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
    });
    const lineModel = new THREE.LineSegments(geometry, material);

    lineModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
    lineModel.userData.originalScale = scaleFactor;
    lineModel.rotation.y = Math.random() * Math.PI;
    lineModel.updateMatrix();

    return lineModel;
}

/**
 * Creates a sphere geometry with vertices randomly placed on the surface of the sphere
 * using {THREE.BufferGeometry}.
 * @param {float} _options.radius - radius of the sphere (default: 1.0).
 * @param {int} _options.vertexCount - number of vertices to be used to create the sphere geometry (min: 1000).
 * @returns {THREE.BufferGeometry}
 */
function createSphereGeometry(_options = {}) {
    const radius = _options.radius || 1.0;
    const vertexCount = Math.min(_options.vertexCount || 1000, 1000);

    const sphereGeometry = new THREE.BufferGeometry();

    const vertices = [];
    const vertex = new THREE.Vector3();
    for (let i = 0; i < vertexCount; i++) {
        vertex.x = Math.random() * 2 - 1;
        vertex.y = Math.random() * 2 - 1;
        vertex.z = Math.random() * 2 - 1;
        vertex.normalize();
        vertex.multiplyScalar(radius);

        vertices.push(vertex.x, vertex.y, vertex.z);

        vertex.multiplyScalar(Math.random() * 0.09 + 1);

        vertices.push(vertex.x, vertex.y, vertex.z);
    }

    sphereGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

    return sphereGeometry;
}
