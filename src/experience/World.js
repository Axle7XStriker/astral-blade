import * as THREE from "three";
import Experience from "./Experience.js";

/**
 * High-level logical component that encompass all the subjects inside the scene (seen/unseen).
 * It can be viewed as the root of a tree with all the other nodes being the subjects.
 */
export default class World {
    constructor(_options = {}) {
        this.experience = new Experience();
        this.config = this.experience.config;
        this.scene = this.experience.scene;

        this.resources = this.experience.resources;
        this.resources.on("groupEnd", (_group) => {
            if (_group.name === "base") {
                this.setDummy();
            }
        });
    }

    setDummy() {
        this.resources.items.lennaTexture.encoding = THREE.sRGBEncoding;

        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ map: this.resources.items.lennaTexture })
        );
        this.scene.add(cube);
    }

    resize() {}

    update() {}

    destroy() {}
}
