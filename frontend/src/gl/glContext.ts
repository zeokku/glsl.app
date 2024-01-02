import { type ShallowRef, nextTick } from "vue";
import OffscreenWorker from "./worker?worker";

import { canvasFps } from "@/components/Canvas.vue";

let glShared: typeof import("./shared");

let worker: Worker | null;
let gl: WebGL2RenderingContext;

export const initGl = async (canvas: HTMLCanvasElement | OffscreenCanvas) => {
    if ("OffscreenCanvas" in window) {
        let offscreen: OffscreenCanvas | undefined = (
            canvas as HTMLCanvasElement
        ).transferControlToOffscreen();

        worker = new OffscreenWorker();

        offscreen = await new Promise<OffscreenCanvas | undefined>((resolve, reject) => {
            worker!.addEventListener(
                "message",
                function cb({ data }: { data: { type: "init"; offscreen?: OffscreenCanvas } }) {
                    if (data.type === "init") {
                        worker!.removeEventListener("message", cb);

                        // offscreen webgl2 is not supported if offscreen is passed back
                        resolve(data.offscreen);
                    }
                }
            );

            worker!.postMessage({ type: "init", offscreen }, [offscreen!]);
        });

        // @note if offscreen returned, then use main thread
        if (offscreen) {
            console.log("Using main thread canvas");

            canvas = offscreen;

            // @note set worker to null, so main thread is used in all functions
            worker = null;
        }
        // @note no offscreen, then we're rendering in a worker thread
        else {
            console.log("Using OffscreenCanvas!");

            // @note update fps
            worker!.addEventListener("message", ({ data }) => {
                if (data.type === "fps") {
                    canvasFps.value = data.fps;
                }
            });

            return;
        }
    }

    gl = canvas.getContext("webgl2") as WebGL2RenderingContext;

    if (!gl) {
        alert("Update your browser to support WebGL2");
        throw "No WebGL2";
    }

    glShared = await import("./shared");

    let { init, canvasFps: fps } = glShared;

    init(gl);

    requestAnimationFrame(function cb() {
        requestAnimationFrame(cb);

        canvasFps.value = fps.value;
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
        return glShared.updateFragment(source);
    }
};

export const updateMouse = (mouse: any) => {
    if (worker) {
        worker.postMessage({
            type: "mouse",
            mouse,
        });
    } else {
        glShared.updateMouse(mouse);
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
        glShared.updateResolution(width, height);
    }
};

export const updateTexture = (image: ImageBitmap, index: number) => {
    if (worker) {
        worker.postMessage(
            {
                type: "texture",
                image,
                index,
            },
            [image]
        );
    } else {
        glShared.updateTexture(image, index);
    }
};
