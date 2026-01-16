import * as THREE from "three";

import Experience from "./Experience.js";
import { fitObjectToBoundingBox } from "./utils/common.js";
import * as Lottie from "lottie-web";
import { Splide } from "@splidejs/splide";
import { AutoScroll } from "@splidejs/splide-extension-auto-scroll";

import projectsList from "./projects.js";

/** Work view of the experience. */
export default class Work {
    #typedIndividualsTraits;

    constructor(_options = {}) {
        this.experience = new Experience();
        this.scene = this.experience.scene;
        this.camera = this.experience.mainCamera;
        this.renderer = this.experience.renderer;
        this.sizes = this.experience.sizes;
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
        this.#setupLottie();
        this.#setupProjectsGrid();
        this.#arrangeSubjects();

        // this.#setupDebugEnvironment();
    }

    #setupViewText() {
        this.textPlane = this.#setupHtmlArea();
        this.modelView.add(this.textPlane);

        // Animate individual's traits.
        // this.#typedIndividualsTraits = new Typed("#home .typed-element", {
        //     stringsElement: "#home .typed-strings",
        //     typeSpeed: 100,
        //     backDelay: 2100,
        //     backSpeed: 100,
        //     loop: true,
        //     cursorChar: "█",
        // });
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

    #setupLottie() {
        this.lottiePlane = this.#setupHtmlArea();
        this.modelView.add(this.lottiePlane);

        // Populate the HTML component with the appropriate lottie file and configure the animation.
        const lottieDom = document.querySelector("#work .lottie");
        Lottie.loadAnimation({
            container: lottieDom, // the dom element that will contain the animation
            renderer: "svg",
            loop: true,
            autoplay: true,
            path: import.meta.env.BASE_URL + "assets/laboratory.json", // the path to the animation json
        });
    }

    #setupProjectsGrid() {
        this.projectsGridPlane = this.#setupHtmlArea();
        this.modelView.add(this.projectsGridPlane);

        // Populate the HTML component with the projects data and dynamically set up the HTML structure.
        const projectGridDom = document.querySelector("#projects-grid");
        projectGridDom.classList.add("splide");

        const splideTrackDom = document.createElement("div");
        splideTrackDom.classList.add("splide__track");
        projectGridDom.appendChild(splideTrackDom);

        const ulDom = document.createElement("ul");
        ulDom.classList.add("splide__list");
        splideTrackDom.appendChild(ulDom);
        projectsList.forEach((project) => {
            const listItemDom = document.createElement("li");
            listItemDom.classList.add("splide__slide");
            ulDom.appendChild(listItemDom);

            const gridItemDom = document.createElement("div");
            gridItemDom.classList.add("magic-wall-item", "splide__slide__container");
            listItemDom.appendChild(gridItemDom);

            const imageDom = document.createElement("img");
            imageDom.src = project.image_src;
            imageDom.alt = project.name;
            gridItemDom.appendChild(imageDom);

            const externalLinkDom = document.createElement("a");
            externalLinkDom.href = project.ref;
            gridItemDom.appendChild(externalLinkDom);

            const hoverContentDom = document.createElement("div");
            hoverContentDom.innerHtml += project.description;
            gridItemDom.appendChild(hoverContentDom);
        });

        // Animate the HTML component to make it interactive.
        const splide = new Splide("#projects-grid", {
            type: "loop",
            perPage: 4,
            focus: 0,
            drag: "free",
            autoScroll: {
                speed: 1,
            },
        });
        splide.mount({ AutoScroll });
    }

    #arrangeSubjects() {
        if (this.sizes.width > this.sizes.height) {
            fitObjectToBoundingBox(
                this.textPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1 / 4,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(0, 1, this.sizes.width / this.sizes.height + 1)
                )
            );
            fitObjectToBoundingBox(
                this.lottiePlane,
                new THREE.Box3(
                    new THREE.Vector3(0, -1 / 4, -(this.sizes.width / this.sizes.height + 1)),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
            fitObjectToBoundingBox(
                this.projectsGridPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        -1 / 4,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
        } else {
            fitObjectToBoundingBox(
                this.textPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        1 / 3,
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
                this.lottiePlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1 / 3,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        1 / 3,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
            fitObjectToBoundingBox(
                this.projectsGridPlane,
                new THREE.Box3(
                    new THREE.Vector3(
                        -this.sizes.width / this.sizes.height,
                        -1,
                        -(this.sizes.width / this.sizes.height + 1)
                    ),
                    new THREE.Vector3(
                        this.sizes.width / this.sizes.height,
                        -1 / 3,
                        this.sizes.width / this.sizes.height + 1
                    )
                )
            );
        }
    }

    #setupDebugEnvironment() {
        if (this.experience.config.debug) {
            const modelBoundingBox = new THREE.BoxHelper(this.modelView, 0xff0000);
            this.modelView.add(modelBoundingBox);
        }
    }

    set() {
        const workViewDom = document.querySelector("#work.view");

        // Make the HTML part of the view visible and start animating.
        workViewDom.classList.remove("hide");
        workViewDom.classList.add("show");
        // this.#typedIndividualsTraits.start();

        // Set all the subjects of the scene.

        // Add home view model to the scene.
        this.scene.add(this.modelView);
    }

    clear() {
        const workViewDom = document.querySelector("#work.view");

        // Make the HTML part of the view invisible and stop animating.
        workViewDom.classList.remove("show");
        workViewDom.classList.add("hide");
        // this.#typedIndividualsTraits.stop();

        // Remove home view model from the scene.
        this.scene.remove(this.modelView);

        // Clear out all the subjects of the scene.
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

    update() {
        this.subjects.forEach((obj) => {
            if (typeof obj.update === "function") {
                obj.update();
            }
        });
    }

    destroy() {}
}
