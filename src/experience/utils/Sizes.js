import EventEmitter from "./EventEmitter.js";

/** Provides and handles everything related to render area size. */
export default class Sizes extends EventEmitter {
    constructor(_targetElement) {
        if (_targetElement === undefined) {
            throw new Error("Need a target element to determine the canvas size.");
        }

        super();

        this.targetElement = _targetElement;

        // Viewport size
        this.viewport = {};
        this.$sizeViewport = document.createElement("div");
        this.$sizeViewport.style.width = "100%";
        this.$sizeViewport.style.height = "100%";
        this.$sizeViewport.style.position = "absolute";
        this.$sizeViewport.style.top = 0;
        this.$sizeViewport.style.left = 0;
        this.$sizeViewport.style.pointerEvents = "none";

        // Resize event
        this.resize = this.resize.bind(this);
        window.addEventListener("resize", this.resize);

        this.resize();
    }

    /** Called when the window is resized. Obtain the updated render area dimensions. */
    resize() {
        this.targetElement.appendChild(this.$sizeViewport);
        this.viewport.width = this.$sizeViewport.offsetWidth;
        this.viewport.height = this.$sizeViewport.offsetHeight;
        this.targetElement.removeChild(this.$sizeViewport);

        this.width = this.viewport.width;
        this.height = this.viewport.height;

        this.trigger("resize");
    }
}
