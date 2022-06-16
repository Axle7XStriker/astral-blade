import * as THREE from "three";
import { SimplexNoise } from "simplex-noise";

const SIMPLEX_NOISE = new SimplexNoise();

export function max(arr) {
    return arr.reduce(function (a, b) {
        return Math.max(a, b);
    });
}

export function avg(arr) {
    var total = arr.reduce((sum, b) => {
        return sum + b;
    });
    return total / arr.length;
}

export function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

export function modulate(val, minVal, maxVal, outMin, outMax) {
    const fr = fractionate(val, minVal, maxVal);
    const delta = outMax - outMin;
    return outMin + fr * delta;
}

export function modulateSphericalGeometry(mesh, bassFr, trebleFr) {
    var offset = mesh.geometry.parameters.radius;
    var amp = 7;
    var time = window.performance.now();
    const positions = mesh.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
        vertex.normalize();
        var distance =
            offset +
            bassFr +
            SIMPLEX_NOISE.noise3D(
                vertex.x + time * 0.00007,
                vertex.y + time * 0.00008,
                vertex.z + time * 0.00009
            ) *
                amp *
                trebleFr;
        vertex.multiplyScalar(distance);

        positions[i] = vertex.x;
        positions[i + 1] = vertex.y;
        positions[i + 2] = vertex.z;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
}

/**
 * Fits an object inside a bounding box such that the object is placed at the center of the box
 * and occupies the maximum possible area inside the box.
 * @param {Object3D} object - an object to be fitted inside the bounding box.
 * @param {Box3} boundingBox - a bounding box in which the object is fitted.
 */
export function fitObjectToBoundingBox(object, boundingBox) {
    if (!(object instanceof THREE.Object3D)) {
        throw new Error("An object of type {THREE.Object3D} needs to be passed.");
    }
    if (!boundingBox.isBox3) {
        throw new Error("A bounding box of type {THREE.Box3} needs to be passed.");
    }
    // Position object at the center of the bounding box.
    const center = boundingBox.getCenter(new THREE.Vector3());
    object.position.copy(center);

    const objectBBox = new THREE.Box3();
    let prevScaleFactor = 0,
        curScaleFactor = 1;
    while (curScaleFactor - prevScaleFactor >= 1e-8) {
        object.scale.setScalar(curScaleFactor);
        objectBBox.setFromObject(object);
        if (boundingBox.containsBox(objectBBox)) {
            prevScaleFactor = curScaleFactor;
            curScaleFactor *= 2;
        } else {
            curScaleFactor = (prevScaleFactor + curScaleFactor) / 2;
        }
    }
    object.scale.setScalar(curScaleFactor);
}

/** Easing Functions */
const easeInQuad = (t, b, c, d) => {
    t /= d;
    return c * t * t + b;
};

const easeOutQuad = (t, b, c, d) => {
    t /= d;
    return -c * t * (t - 2) + b;
};

const easeInOutQuad = (t, b, c, d) => {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
};

const easeInOutQuart = (t, b, c, d) => {
    if ((t /= d / 2) < 1) {
        return (c / 2) * t * t * t * t + b;
    } else {
        return (-c / 2) * ((t -= 2) * t * t * t - 2) + b;
    }
};

const easeInSine = (t, b, c, d) => {
    return -c * Math.cos((t / d) * (Math.PI / 2)) + c + b;
};

const easeOutSine = (t, b, c, d) => {
    return c * Math.sin((t / d) * (Math.PI / 2)) + b;
};

const easeInOutSine = (t, b, c, d) => {
    return (-c / 2) * (Math.cos((Math.PI * t) / d) - 1) + b;
};

export {
    easeInQuad,
    easeOutQuad,
    easeInOutQuad,
    easeInOutQuart,
    easeInSine,
    easeOutSine,
    easeInOutSine,
};
