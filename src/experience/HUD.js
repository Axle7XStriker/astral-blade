import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

import Experience from "./Experience.js";

/** A heads-up display (HUD) for displaying data that is independent of viewpoint. */
export default class HUD {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.resources = this.experience.resources;

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
        let subPathGeometries = [];
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];

            for (let j = 0, jl = path.subPaths.length; j < jl; j++) {
                const subPath = path.subPaths[j];
                const subPathGeometry = SVGLoader.pointsToStroke(
                    subPath.getPoints(),
                    path.userData.style
                );
                if (subPathGeometry) {
                    subPathGeometries.push(subPathGeometry);
                }
            }
        }
        const pathGeometry = mergeBufferGeometries(subPathGeometries, true);

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

        return hudBoundary;
    }
}
