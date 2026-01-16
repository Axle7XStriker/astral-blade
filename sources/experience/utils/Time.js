import EventEmitter from "./EventEmitter.js";

/** Provides and handles everything related to time such as clock, duration, instant, timezone, etc. */
export default class Time extends EventEmitter {
    constructor() {
        super();

        this.start = Date.now();
        this.current = this.start;
        this.elapsed = 0;
        this.delta = 16;
        this.playing = true;

        this.tick = this.tick.bind(this);
        this.tick();
    }

    play() {
        this.playing = true;
    }

    pause() {
        this.playing = false;
    }

    /**
     * Updates various fields associated with time for e.g., current time, time passed since the
     * last update (delta), etc, before each frame is rendered.
     */
    tick() {
        this.ticker = window.requestAnimationFrame(this.tick);

        const current = Date.now();

        this.delta = current - this.current;
        this.elapsed += this.playing ? this.delta : 0;
        this.current = current;

        if (this.delta > 60) {
            this.delta = 60;
        }

        if (this.playing) {
            this.trigger("tick");
        }
    }

    /**
     * Stops updating time fields before each frame is rendered.
     */
    stop() {
        window.cancelAnimationFrame(this.ticker);
    }
}
