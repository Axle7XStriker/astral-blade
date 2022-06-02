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
