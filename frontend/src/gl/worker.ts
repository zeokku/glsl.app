/// <reference lib="webworker" />

let gl: WebGL2RenderingContext;

interface IInitMessage {
    type: "init";
    offscreen: OffscreenCanvas;
}

interface IResolutionMessage {
    type: "resolution";
    width: number;
    height: number;
}

interface IMouseMessage {
    type: "mouse";
    mouse: any;
}

interface IFragmentMessage {
    type: "fragment";
    source: string;
}

interface ITextureMessage {
    type: "texture";
    image: ImageBitmap;
    index: number;
}

type TMessages =
    | IInitMessage
    | IResolutionMessage
    | IMouseMessage
    | IFragmentMessage
    | ITextureMessage;

let glShared: typeof import("./shared");

onmessage = async ({ data }: { data: TMessages }) => {
    switch (data.type) {
        case "init":
            {
                const { offscreen } = data;
                // @note using inexistent context identifier will lead to an exception, which is weird since according to docs it should instead return null
                // requesting webgl2 on older ios versions where webgl2 is not supported in workers will return `null` following the specification
                try {
                    gl = offscreen.getContext("webgl2")!;
                } catch {}

                if (gl) {
                    // @note load and save shared logic module
                    glShared = await import("./shared");

                    let { init, canvasFps } = glShared;

                    init(gl);

                    requestAnimationFrame(function cb() {
                        requestAnimationFrame(cb);

                        postMessage({ type: "fps", fps: canvasFps.value });
                    });

                    postMessage({ type: "init" });
                } else {
                    // @note mostly used on ios if webgl is not supported in worker, so pass offscreen back to main thread to work on it
                    postMessage({ type: "init", offscreen }, [offscreen]);

                    close();
                }
            }
            break;

        case "resolution":
            {
                glShared?.updateResolution(data.width, data.height);
            }
            break;

        case "mouse":
            {
                // @note this can be triggered before gl context is initialized
                glShared?.updateMouse(data.mouse);
            }
            break;

        case "fragment":
            {
                let result = glShared.updateFragment(data.source);

                postMessage({ type: "fragment", result });
            }
            break;
        case "texture":
            {
                glShared.updateTexture(data.image, data.index);
            }
            break;
    }
};
