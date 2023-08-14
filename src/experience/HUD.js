import * as THREE from "three";
import { mergeBufferGeometries } from "three/examples/jsm/utils/BufferGeometryUtils";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

import Experience from "./Experience.js";
import { convertShapePathsToBufferGeometry } from "./utils/common.js";

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
        this.modelView.add(this.#createFeedbackIcon());

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

        return hudBoundary;
    }

    #createFeedbackIcon() {
        const feedbackIcon = new THREE.Group();

        const planeGeometry = new THREE.PlaneGeometry(0.3, 0.1)
        const translationMatrix = new THREE.Matrix4().makeTranslation(1.05, -0.75, 0);
        const innerIconBoundaryGeometry = new THREE.EdgesGeometry(planeGeometry);
        innerIconBoundaryGeometry.applyMatrix4(translationMatrix);
        planeGeometry.applyMatrix4(new THREE.Matrix4().makeScale(1.05, 1.15, 1));
        const outerIconBoundaryGeometry = new THREE.EdgesGeometry(planeGeometry);
        outerIconBoundaryGeometry.applyMatrix4(translationMatrix)
    
        const iconBoundaryMaterial = new THREE.LineBasicMaterial({color: 0x67C7EB});
        // All HUD elements need to remain fixed in their specified position irrespective of camera position.
        iconBoundaryMaterial.onBeforeCompile = function (shader) {
            shader.vertexShader = shader.vertexShader.replace(
                `#include <project_vertex>`,
                `
                    #include <project_vertex>
                    gl_Position = vec4( transformed, 1.0 );
                `
            );
        };
        const innerIconBoundary = new THREE.LineSegments(innerIconBoundaryGeometry, iconBoundaryMaterial);
        const outerIconBoundary = new THREE.LineSegments(outerIconBoundaryGeometry, iconBoundaryMaterial);
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
            positions[i] = -(((positions[i] - boundingBox.min.x) * 0.1) / size.x - 0.15);
            positions[i + 1] = -(((positions[i + 1] - boundingBox.min.y) * 0.1) / size.y - 0.15);
        }
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
                    gl_Position = modelMatrix * vec4( transformed, 1.0 );
                `
            );
        };
        const feedbackIconSvg = new THREE.Mesh(pathGeometry, material);
        feedbackIcon.add(feedbackIconSvg);

        return feedbackIcon;
    }
}
