import * as THREE from "three";

/** Provides users with the ability to interact with various elements of the experience. */
export default class InteractiveControls extends THREE.EventDispatcher {
    #enabled;

    get enabled() {
        return this.#enabled;
    }

    /**
     * @param {THREE.Camera} camera - a three.js camera instance.
     * @param {HTMLElement} targetElement - any HTML element within which the interactive controls need to work.
     */
    constructor(camera, targetElement) {
        super();
        this.camera = camera;
        this.targetElement = targetElement || window;
        this.rect = this.targetElement.getBoundingClientRect();

        // Used to indicate that the pointer is in a transitionary state where an operation
        // equivalent to a mouse click down has happened but the accompanying mouse click up
        // equivalent operation hasn't.
        this.isDown = false;
        this.#initMouseRaycaster();

        // Activate the interactive controls.
        this.enable();
    }

    /** Initialize mouse raycaster and other associated elements. */
    #initMouseRaycaster() {
        this.plane = new THREE.Plane();
        // Used to check for objects being intersected by the mouse pointer from a 2D perspective.
        this.raycaster = new THREE.Raycaster();

        // 2D coordinates of the mouse pointer.
        this.mouse = new THREE.Vector2();
        this.offset = new THREE.Vector3();
        this.intersection = new THREE.Vector3();

        // List of three.js objects to check for intersection with the mouse from a 2D perspective.
        this.objectsToCheck = [];
        // Current three.js object that is being hovered over.
        this.hovered = null;
        // The most recent three.js object that was selected by a mouse click.
        this.selected = null;
    }

    /**
     * Activates the controls by attaching all the control listeners to the corresponding target
     * element events.
     */
    enable() {
        if (this.#enabled) return;
        this.#addListeners();
        this.#enabled = true;
    }

    /**
     * Deactivates the controls by detaching all the control listeners from the corresponding
     * target element events.
     */
    disable() {
        if (!this.#enabled) return;
        this.#removeListeners();
        this.#enabled = false;
    }

    /** Attaches all the control listeners to their appropriate target element event. */
    #addListeners() {
        this.handlerDown = this.#onDown.bind(this);
        this.handlerMove = this.#onMove.bind(this);
        this.handlerUp = this.#onUp.bind(this);
        this.handlerLeave = this.#onLeave.bind(this);

        // Touch events
        this.targetElement.addEventListener("touchstart", this.handlerDown, passiveEvent);
        this.targetElement.addEventListener("touchmove", this.handlerMove, passiveEvent);
        this.targetElement.addEventListener("touchend", this.handlerUp, passiveEvent);
        // Mouse events
        this.targetElement.addEventListener("mousedown", this.handlerDown);
        this.targetElement.addEventListener("mousemove", this.handlerMove);
        this.targetElement.addEventListener("mouseup", this.handlerUp);
        this.targetElement.addEventListener("mouseleave", this.handlerLeave);
    }

    /** Detaches all the control listeners from their appropriate target element event. */
    #removeListeners() {
        // Touch events
        this.targetElement.removeEventListener("touchstart", this.handlerDown);
        this.targetElement.removeEventListener("touchmove", this.handlerMove);
        this.targetElement.removeEventListener("touchend", this.handlerUp);
        // Mouse events
        this.targetElement.removeEventListener("mousedown", this.handlerDown);
        this.targetElement.removeEventListener("mousemove", this.handlerMove);
        this.targetElement.removeEventListener("mouseup", this.handlerUp);
        this.targetElement.removeEventListener("mouseleave", this.handlerLeave);
    }

    /** Records the updated dimensions of the target element. */
    resize(x, y, width, height) {
        if (x || y || width || height) {
            this.rect = { x, y, width, height };
        } else if (this.targetElement === window) {
            this.rect = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
        } else {
            this.rect = this.targetElement.getBoundingClientRect();
        }
    }

    /**
     * Updates mouse coordinates and tracks objects with which the mouse may have come into
     * contact because of the move operation.
     */
    #onMove(e) {
        const t = e.touches ? e.touches[0] : e;
        const touch = { x: t.clientX, y: t.clientY };

        this.mouse.x = ((touch.x + this.rect.x) / this.rect.width) * 2 - 1;
        this.mouse.y = -((touch.y + this.rect.y) / this.rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        /*
        // is dragging
        if (this.selected && this.isDown) {
            if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
                this.dispatchEvent({ type: 'interactive-drag', object: this.selected, position: this.intersection.sub(this.offset) });
            }
            return;
        }
        */

        const intersects = this.raycaster.intersectObjects(this.objectsToCheck);

        if (intersects.length > 0) {
            this.intersectionData = intersects[0];
            const object = intersects[0].object;

            this.plane.setFromNormalAndCoplanarPoint(
                this.camera.getWorldDirection(this.plane.normal),
                object.position
            );

            if (this.hovered !== object) {
                this.dispatchEvent({ type: "interactive-out", object: this.hovered });
                this.dispatchEvent({ type: "interactive-over", object });
                this.hovered = object;
            } else {
                this.dispatchEvent({ type: "interactive-move", object, intersectionData: this.intersectionData });
            }
        } else {
            this.intersectionData = null;

            if (this.hovered !== null) {
                this.dispatchEvent({ type: "interactive-out", object: this.hovered });
                this.hovered = null;
            }
        }
    }

    /**
     * Updates the most recent selected object and triggers all the appropriate interactive
     * specific events that should occur due to a mouse click down event besides making the
     * usual mouse move updates.
     */
    #onDown(e) {
        this.isDown = true;
        this.#onMove(e);

        this.dispatchEvent({ type: "interactive-down",
            object: this.hovered,
            previous: this.selected,
            intersectionData: this.intersectionData,
        });
        this.selected = this.hovered;

        if (this.selected) {
            if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
                this.offset.copy(this.intersection).sub(this.selected.position);
            }
        }
    }

    /**
     * Triggers all the appropriate interactive specific events that should occur due to a
     * mouse click up event.
     */
    #onUp(e) {
        if (!this.isDown) return;
        this.isDown = false;

        this.dispatchEvent({ type: "interactive-up", object: this.hovered });
    }

    /**
     * Does the mouse click up event updates, trigger any relevant interactivity specific events,
     * and reset the hovered object field since the pointer has no interactive controls outside
     * the target element.
     */
    #onLeave(e) {
        this.#onUp(e);

        this.dispatchEvent({ type: "interactive-out", object: this.hovered });
        this.hovered = null;
    }
}

/** Helpers **/

/**
 * If passive property is supported, setting it to true can dramatically improve scrolling
 * performance with passive listeners in an application.
 */
let alreadyTested = false;
let passiveSupported = false;
const isSupported = () => {
    if (alreadyTested) return passiveSupported;
    alreadyTested = true;

    // Test via a getter in the options object to see if the passive property is accessed
    try {
        let opts = Object.defineProperty({}, "passive", {
            get: () => {
                passiveSupported = true;
            },
        });
        window.addEventListener("test", null, opts);
    } catch (e) {
        return passiveSupported;
    }
    window.removeEventListener("test", null, opts);
    return passiveSupported;
};

/** Returns a characteristic object specific to passive event listeners, if they are supported by the browser. */
const passiveEvent = () => {
    return isSupported() ? { passive: true } : false;
};
