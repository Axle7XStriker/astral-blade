import EventEmitter from "./EventEmitter.js";
import Experience from "../Experience.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader";

/** An aggregate of various loaders which is used to load assets of different kinds. */
export default class Loader extends EventEmitter {
    constructor() {
        super();

        this.experience = new Experience();
        this.renderer = this.experience.renderer.instance;

        this.setLoaders();

        this.toLoad = 0;
        this.loaded = 0;
        this.items = {};
    }

    /**
     * Creates an array containing various asset loaders along with the file format(s) they handle.
     */
    setLoaders() {
        this.loaders = [];

        // Images
        this.loaders.push({
            extensions: ["jpg", "jpeg", "png"],
            action: (_resource) => {
                const image = new Image();

                image.addEventListener("load", () => {
                    this.fileLoadEnd(_resource, image);
                });

                image.addEventListener("error", () => {
                    this.fileLoadEnd(_resource, image);
                });

                image.src = _resource.source;
            },
        });

        // Draco
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("draco/");
        dracoLoader.setDecoderConfig({ type: "js" });

        this.loaders.push({
            extensions: ["drc"],
            action: (_resource) => {
                dracoLoader.load(_resource.source, (_data) => {
                    this.fileLoadEnd(_resource, _data);

                    DRACOLoader.releaseDecoderModule();
                });
            },
        });

        // GLTF
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        this.loaders.push({
            extensions: ["glb", "gltf"],
            action: (_resource) => {
                gltfLoader.load(_resource.source, (_data) => {
                    this.fileLoadEnd(_resource, _data);
                });
            },
        });

        // FBX
        const fbxLoader = new FBXLoader();

        this.loaders.push({
            extensions: ["fbx"],
            action: (_resource) => {
                fbxLoader.load(_resource.source, (_data) => {
                    this.fileLoadEnd(_resource, _data);
                });
            },
        });

        // RGBE | HDR
        const rgbeLoader = new RGBELoader();

        this.loaders.push({
            extensions: ["hdr"],
            action: (_resource) => {
                rgbeLoader.load(_resource.source, (_data) => {
                    this.fileLoadEnd(_resource, _data);
                });
            },
        });

        // SVG
        const svgLoader = new SVGLoader();

        this.loaders.push({
            extensions: ["svg"],
            action: (_resource) => {
                svgLoader.load(_resource.source, (_data) => {
                    this.fileLoadEnd(_resource, _data);
                });
            },
        });
    }

    /** Loads the given resources into memory. */
    load(_resources = []) {
        for (const _resource of _resources) {
            this.toLoad++;
            const extensionMatch = _resource.source.match(/\.([a-z]+)$/);

            if (typeof extensionMatch[1] !== "undefined") {
                const extension = extensionMatch[1];
                const loader = this.loaders.find((_loader) =>
                    _loader.extensions.find((_extension) => _extension === extension)
                );

                if (loader) {
                    loader.action(_resource);
                } else {
                    console.warn(`Cannot found loader for ${_resource}`);
                }
            } else {
                console.warn(`Cannot found extension of ${_resource}`);
            }
        }
    }

    /** Called when a file is completely loaded into the memory. */
    fileLoadEnd(_resource, _data) {
        this.loaded++;
        this.items[_resource.name] = _data;

        this.trigger("fileEnd", [_resource, _data]);

        if (this.loaded === this.toLoad) {
            this.trigger("end");
        }
    }
}
