import * as THREE from "three";

import Experience from "./Experience.js";
import { fitObjectToBoundingBox } from "./utils/common.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

/** Fun view of the experience. */
export default class Fun {

    constructor(_options = {}) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.camera = this.experience.mainCamera;
        this.renderer = this.experience.renderer;
        this.sizes = this.experience.sizes;
        this.time = this.experience.time;
        this.resources = this.experience.resources;
        this.init();
    }

    init() {
        // A collection of all the spawned subjects.
        this.subjects = [];

        // Initialize all the elements to put in the view.
        this.modelView = new THREE.Group();
        this.container = new THREE.Mesh(
            new THREE.BoxBufferGeometry(2, 2, 2),
            new THREE.MeshBasicMaterial({
                wireframe: true,
                depthWrite: false,
                transparent: true,
                opacity: this.experience.config.debug ? 1 : 0,
            })
        );
        this.container.scale.set(
            this.sizes.width / this.sizes.height,
            1,
            this.sizes.width / this.sizes.height + 1
        );
        this.modelView.add(this.container);
        this.#setupViewText();
        this.resources.on("groupEnd", (_group) => {
            if (_group.name === "FunActivites") {
                this.#setupTravelCar();
                this.#arrangeSubjects();
                // this.#setupDebugEnvironment();
            }
        });

    }

    #setupViewText() {
        this.textPlane = this.#setupHtmlArea();
        this.modelView.add(this.textPlane);
    }

    /**
     * Sets up an invisible dedicated area in the view container to avoid any overlaps between
     * three.js and html components.
     */
    #setupHtmlArea() {
        return new THREE.Mesh(
            new THREE.PlaneBufferGeometry(1, 1),
            new THREE.MeshBasicMaterial({
                wireframe: true,
                depthWrite: false,
                transparent: true,
                opacity: this.experience.config.debug ? 1 : 0,
            })
        );
    }

    /** Setup the model of the car and associated lighting. */
    #setupCar() {
        this.travelCar.add(new THREE.AmbientLight(0x68c3c0))
        // One point light is placed at each corner of the container.
        const x_range = [-this.sizes.width / this.sizes.height, this.sizes.width / this.sizes.height];
        const y_range = [-1, 1];
        const z_range = [-(this.sizes.width / this.sizes.height + 1), this.sizes.width / this.sizes.height + 1];
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                for (let k = 0; k < 2; k++) {
                    const pointLight = new THREE.PointLight(0x68c3c0, 1);
                    pointLight.position.set(x_range[i], y_range[j], z_range[k]);
                    this.travelCar.add(pointLight);
                }
            }
        }
        
        this.car = this.resources.items.travelCar.scene.children[0];
        this.car.rotateZ(Math.PI * 0.5);
        this.travelCar.add(this.car);
    }

    #setupRoad() {
        this.road = new THREE.Group();
        // In order to give an effect of an infinite road, the road's length needs to be bigger 
        // than the viewport and width greater than car's width.
        const roadWidth = 1;
        const roadLength = 4;
        this.road.userData['roadWidth'] = roadWidth;
        this.road.userData['roadLength'] = roadLength;
        // Using background as the color of the road and just the edges of the box as road's 
        // outlines/boundary. Also, the box is kept super thin to give a plane's outlook.
        const roadGeometry = new THREE.BoxGeometry(roadLength, 1e-3, roadWidth);
        const roadEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(roadGeometry),
            new THREE.LineBasicMaterial({
                color: 0x68c3c0,
            })
        );
        this.road.add(roadEdges);

        // Divinding the whole road into 10 equal parts and putting a standard road marker
        // in the middle of each.
        const roadMarkMaterial = new THREE.MeshBasicMaterial({ color: 0x68c3c0 });
        for(let i = 1; i <= 10; i++) {
            const roadMark = new THREE.Mesh(roadGeometry, roadMarkMaterial);
            roadMark.scale.set(1/20, 1/20, 1/20);
            roadMark.position.set(-roadLength/2 + (i-1)*roadLength/10 + roadLength/20, 0, 0);
            this.road.add(roadMark);
        } 

        // this.road.position.y = -0.45
        this.travelCar.add(this.road);
    }

    /** Add travel car model and associated scenery to the scene. */
    #setupTravelCar() {
        this.travelCar = new THREE.Group();
        this.#setupCar();
        this.#setupRoad();
        this.modelView.add(this.travelCar);
    }

    /** 
     * The model view is divided into a 1x2 grid with (1, 1) consisting of the HTML area 
     * and (1, 2) consisting of different illustrations that fade-in and out of the view one-by-one.
     */
    #arrangeSubjects() {
        if (this.sizes.width > this.sizes.height) {
            // Landscape Orientation
            fitObjectToBoundingBox(
                this.textPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        0,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(0, 1, this.sizes.width / this.sizes.height + 1)
                )
            );
            fitObjectToBoundingBox(
                this.car,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height, 
                        -1, 
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        0,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
            fitObjectToBoundingBox(
                this.road,
                new THREE.Box3(
                    new THREE.Vector3(
                        -4 * this.sizes.width / this.sizes.height, 
                        -1, 
                        -(this.sizes.width / this.sizes.height + 1) / 2
                    ),
                    new THREE.Vector3(
                        4 * this.sizes.width / this.sizes.height,
                        0.1,
                        (this.sizes.width / this.sizes.height + 1) / 2
                    )
                )
            );
        } else {
            // Portrait Orientation
            fitObjectToBoundingBox(
                this.textPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        1 / 2,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
            fitObjectToBoundingBox(
                this.car,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1 / 2,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
            fitObjectToBoundingBox(
                this.road,
                new THREE.Box3(
                    new THREE.Vector3(
                        -16 * this.sizes.width / this.sizes.height,
                        -1,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        16 * this.sizes.width / this.sizes.height,
                        0.575,
                        (this.sizes.width / this.sizes.height + 1)
                    )
                )
            );
        }
    }

    #setupDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.car, 0xff0000);
            this.modelView.add(modelBoundingBox);
        }
    }

    set() {
        const viewDom = document.querySelector("#fun.view");

        // Make the HTML part of the view visible and start animating.
        viewDom.classList.remove("hide");
        viewDom.classList.add("show");

        // Set all the subjects of the scene.

        // Add view model to the scene.
        this.scene.add(this.modelView);
    }

    clear() {
        const viewDom = document.querySelector("#fun.view");

        // Make the HTML part of the view invisible and stop animating.
        viewDom.classList.remove("show");
        viewDom.classList.add("hide");

        // Remove view model from the scene.
        this.scene.remove(this.modelView);

        // Reset/Clear out all the subjects of the scene.
        // Due to road being wider than the view container, subsequent camera focus might lead to 
        // displaced objects if the road's length is not balanced on both sides of the y-z plane. 
        this.road.position.x = 0;
    }

    resize() {
        this.subjects.forEach((obj) => {
            if (typeof obj.resize === "function") {
                obj.resize();
            }
        });

        this.#arrangeSubjects();
        this.container.scale.set(
            this.sizes.width / this.sizes.height,
            1,
            this.sizes.width / this.sizes.height + 1
        );
    }

    #rotateRim(modelName) {
        // Get the appropriate three.js object
        const rim = this.scene.getObjectByName(modelName);
        const boundingBox = new THREE.Box3();
        boundingBox.setFromObject(rim);
        const center = boundingBox.getCenter(new THREE.Vector3());
        // Detach it from the current group and attach it at the top-level as a separate object.
        this.modelView.attach(rim);
        rim.rotateAroundWorldAxis(center, new THREE.Vector3(0, 0, 1), -this.time.current*5e-14);
        // Re-attach it to its original group/object after rotating it around the appropriate axis.
        this.car.attach(rim);
    }

    #carMotion(t) {
        const vibration_amplitude = 0.0005  
        const vibration_frequency = 10.0 
        
        const vibration = vibration_amplitude * Math.sin(2 * Math.PI * vibration_frequency * t)
        
        this.car.position.y += vibration;
    }

    update() {
        if (this.car && this.road) {
            // Both the rotation of the rims and car's motion on the y-axis constitutes a moving car.
            // Only the visible rims are rotated.
            this.#rotateRim("Group21");
            this.#rotateRim("Group23");
            this.#carMotion(this.time.current*1e-4);

            // Moving the road object on the x-axis from right to left to complete the animation of a 
            // moving car. The x-coordinate of the road object is resetted after it crosses a certain
            // threshold according to how much over it has gone beyond the threshold.
            const threshold = this.road.userData['roadLength'] * this.road.scale.x / 10;
            if (this.road.position.x > -threshold)
                this.road.position.x -= this.time.delta*5e-4;
            else 
                this.road.position.x = threshold + (-threshold - this.road.position.x);
        }

        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
    }

    destroy() {}
}

/** Helpers **/

THREE.Object3D.prototype.rotateAroundWorldAxis = function() {

    // rotate object around axis in world space (the axis passes through point)
    // axis is assumed to be normalized
    // assumes object does not have a rotated parent

    var q = new THREE.Quaternion();

    return function rotateAroundWorldAxis( point, axis, angle ) {

        q.setFromAxisAngle( axis, angle );

        this.applyQuaternion( q );

        this.position.sub( point );
        this.position.applyQuaternion( q );
        this.position.add( point );

        return this;

    }

}();