import { type ShallowRef, nextTick } from "vue";
import offscreenWorker from "./worker?worker";

import { canvasFps } from "@/components/Canvas.vue";

let worker: Worker | null;
let gl: WebGL2RenderingContext;

let program: WebGLProgram;
let fragmentShader: WebGLShader;

export const initGl = async (canvas: ShallowRef<HTMLCanvasElement>, key: ShallowRef) => {
    if ("OffscreenCanvas" in window) {
        let offscreen = canvas.value.transferControlToOffscreen();

        worker = new offscreenWorker();

        let result = await new Promise((resolve, reject) => {
            worker!.addEventListener("message", function cb({ data }) {
                if (data.type === "init") {
                    worker!.removeEventListener("message", cb);

                    // offscreen webgl2 is not supported if error is present
                    resolve(!data.error);
                }
            });

            worker!.postMessage({ type: "init", canvas: offscreen }, [offscreen]);
        });

        // @note successfully obtained offscreen webgl2 context
        if (result) {
            console.log("using offscreen canvas!");

            worker!.addEventListener("message", ({ data }) => {
                if (data.type === "fps") {
                    canvasFps.value = data.fps;
                }
            });

            return;
        }

        console.log("recreate canvas as offscreen didn't work");

        worker = null;
        // @note force update canvas node
        key.value = "new";
        await nextTick();
    }

    console.log("using main thread canvas");

    gl = canvas.value.getContext("webgl2")!;

    if (!gl) {
        alert("Update your browser to support WebGL2");
        throw "No WebGL2";
    }

    await import("./shared").then(({ init, canvasFps: fps }) => {
        init(gl);
        requestAnimationFrame(function cb() {
            requestAnimationFrame(cb);

            canvasFps.value = fps.value;
        });
    });
};

export const updateFragment = async (source: string) => {
    if (worker) {
        return new Promise<string>(resolve => {
            worker!.addEventListener("message", function cb({ data }) {
                if (data.type === "fragment") {
                    worker!.removeEventListener("message", cb);

                    resolve(data.result);
                }
            });

            worker!.postMessage({
                type: "fragment",
                source,
            });
        });
    } else {
        return import("./shared").then(({ updateFragment }) => updateFragment(source));
    }
};

export const updateMouse = (mouse: any) => {
    if (worker) {
        worker.postMessage({
            type: "mouse",
            mouse,
        });
    } else {
        import("./shared").then(({ updateMouse }) => updateMouse(mouse));
    }
};

export const updateResolution = (width: number, height: number) => {
    if (worker) {
        worker.postMessage({
            type: "resolution",
            width,
            height,
        });
    } else {
        import("./shared").then(({ updateResolution }) => updateResolution(width, height));
    }
};

export const updateTextures = () => {};
