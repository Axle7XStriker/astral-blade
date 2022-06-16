import * as THREE from "three";

import Experience from "./Experience.js";

/** Manages everything related to rendering audio and its visualization. */
export default class AudioManager {
    constructor(_options = {}) {
        this.experience = new Experience();

        // Create an {AudioListener} and add it to the camera.
        this.audioListener = new THREE.AudioListener();
        this.fftSize = 512;
        this.experience.mainCamera.instance.add(this.audioListener);
    }

    setupAudio(src) {
        const audio = new THREE.Audio(this.audioListener);
        if (/(iPad|iPhone|iPod)/g.test(navigator.userAgent)) {
            const loader = new THREE.AudioLoader();
            loader.load(src, (buffer) => {
                audio.setBuffer(buffer);
                audio.setVolume(1);
                audio.play();
            });
        } else {
            const mediaElement = new Audio(src);
            mediaElement.play();
            audio.setMediaElementSource(mediaElement);
        }
        this.analyser = new THREE.AudioAnalyser(audio, this.fftSize);
    }

    /**
     * Gets current frequency data in an {Uint8Array} of the most recent audio that is being
     * analyzed by {THREE.AudioAnalyser}.
     */
    getAudioData() {
        if (this.analyser === undefined) return;
        return this.analyser.getFrequencyData();
    }
}
