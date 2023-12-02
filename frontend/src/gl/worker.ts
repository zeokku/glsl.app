let gl: WebGL2RenderingContext;

interface IInitMessage {
    type: "init";
    canvas: OffscreenCanvas;
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

type TMessages = IInitMessage | IResolutionMessage | IMouseMessage | IFragmentMessage;

self.onmessage = ({ data }: { data: TMessages }) => {
    switch (data.type) {
        case "init":
            {
                // @todo test logic of unsupported webgl2 with nonexistent name
                try {
                    gl = data.canvas.getContext("webgl2")!;
                } catch {}

                if (gl) {
                    import("./shared").then(({ init, canvasFps }) => {
                        init(gl);

                        requestAnimationFrame(function cb() {
                            requestAnimationFrame(cb);

                            self.postMessage({ type: "fps", fps: canvasFps.value });
                        });
                    });

                    self.postMessage({ type: "init" });
                } else {
                    self.postMessage({ type: "init", error: "WebGL2 is not supported in worker" });
                }
            }
            break;

        case "resolution":
            {
                import("./shared").then(({ updateResolution }) => {
                    updateResolution(data.width, data.height);
                });
            }
            break;

        case "mouse":
            {
                import("./shared").then(({ updateMouse }) => {
                    updateMouse(data.mouse);
                });
            }
            break;

        case "fragment":
            {
                import("./shared").then(({ updateFragment }) => {
                    let result = updateFragment(data.source);

                    self.postMessage({ type: "fragment", result });
                });
            }
            break;
    }
};
