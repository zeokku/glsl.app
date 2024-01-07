<template lang="pug">
.canvas-wrap(v-movable)
    canvas(ref="canvasRef" @mousemove="onMouseMove" @contextmenu.prevent)
</template>

<script lang="ts">
export let canvasFps = { value: 60 };

let canvasRef = $shallowRef<HTMLCanvasElement>();
export let getCanvas = () => canvasRef;
</script>

<script setup lang="ts">
import throttle from "lodash.throttle";
import { onMounted, onUpdated, watch } from "vue";

import { TEXTURE_SOURCES_LENGTH, TTextureSource, textureSourceRefs } from "./TexturesModal.vue";
import {
    initGl,
    updateFragment,
    updateMouse,
    updateResolution,
    updateTexture,
} from "@/gl/glContext";

const emit = defineEmits<{
    (e: "compile", infoLog: string): void;
}>();

const props = defineProps<{
    shaderCode: string;
}>();

// @note onUpdated may fire before the init finished
let initGlPromise: Promise<unknown>;

onMounted(async () => {
    initGlPromise = initGl(canvasRef!);

    await initGlPromise;

    const resizeObserver = new ResizeObserver(
        throttle<ResizeObserverCallback>(
            ([
                {
                    contentRect: { width, height },
                },
            ]) => {
                updateResolution(width, height);
            },
            100
        )
    );

    resizeObserver.observe(canvasRef!);
});

let cachedTextureElements = Array.from<TTextureSource>({ length: 16 });

watch(textureSourceRefs, async () => {
    console.log("watch texture source refs");

    await initGlPromise;

    textureSourceRefs.forEach(async (el, i) => {
        // @note the @bug with updating only single element was propagated to entire array
        // was caused by improper Array.fill(["", null])
        // all array elements were assigned to the same tuple reference
        //

        let cachedEl = cachedTextureElements[i];

        // slot is defined and element has been initialized or changed
        // cached and el will be only different if:
        //     1. empty slot is initialized for the first time
        //     2. type of source is changed (img <-> video)
        // subsequent img / video changes won't trigger this code, instead the textures will be updated in on image load / on next frame
        if (el && cachedEl !== el) {
            console.log("Update texture", i, el);

            if (cachedEl && "raf" in cachedEl) {
                console.log("Cancel frame", cachedEl.raf);

                cancelAnimationFrame(cachedEl.raf);
            }

            cachedTextureElements[i] = el;

            const isVideo = (el: HTMLElement): el is HTMLVideoElement & { raf: number } =>
                el.tagName === "VIDEO";

            if (isVideo(el)) {
                const uploadVideoUpdates = () => {
                    // @note remove canplay listener, because it will be fired again when video loops
                    el.oncanplay = null;

                    requestAnimationFrame(async function frame() {
                        el.raf = requestAnimationFrame(frame);

                        updateTexture(
                            // @note for some reason pixelStorei has no effect on this unless we specify flipY in creation options
                            await createImageBitmap(el, {
                                imageOrientation: "flipY",
                            }),
                            i
                        );
                    });
                };

                // @note only either of these should be processed
                // since we update video each frame
                // change of src will be handled automatically
                if (el.readyState === /* HAVE_ENOUGH_DATA */ 4) uploadVideoUpdates();
                else el.oncanplay = uploadVideoUpdates;

                // @note when modal is closed video is automatically paused
                // so force play state when it's paused, so it doesn't pause again
                el.onpause = () => el.play();
            } else {
                // @note if it's already complete, onload won't fire for this image
                if (el.complete)
                    updateTexture(
                        await createImageBitmap(el, {
                            imageOrientation: "flipY",
                        }),
                        i
                    );

                // @note when you change image source, <img> element remains the same
                // only src attribute changes, so onload event will fire again
                el.onload = async () =>
                    updateTexture(
                        await createImageBitmap(el, {
                            imageOrientation: "flipY",
                        }),
                        i
                    );
            }
        }
    });
});

// @note it's also called when props change
onUpdated(async () => {
    await initGlPromise;

    let log = await updateFragment(props.shaderCode);

    emit("compile", log ?? "");
});

let mouse = { x: 0, y: 0, lb: 0, rb: 0 };
const onMouseMove = ({ offsetX, offsetY, buttons }: MouseEvent) => {
    mouse.x = offsetX;
    mouse.y = offsetY;

    mouse.lb = buttons & 0x1 && 1;
    mouse.rb = buttons & 0x2 && 1;

    updateMouse(mouse);
};
</script>

<style module lang="less">
.canvas-wrap {
    position: fixed;
    top: 0;

    width: 600px;
    height: 500px;
    // width: 400px;
    // height: 300px;

    min-width: 100px;
    min-height: 100px;

    overflow: hidden;

    // background: black;

    border: 1px solid rgb(255 255 255 / 30%);

    cursor: move;

    :fullscreen {
        cursor: crosshair;
    }

    // @resizer-sz: 10px;

    // &::-webkit-resizer {
    //     width: @resizer-sz;
    //     height: @resizer-sz;

    //     // background-size: 100% 100%;
    //     // background-image: url(/arrow-down-right.svg);
    // }

    // @todo report bug
    // &:hover&::-webkit-resizer {
    //     background-image: url(/arrow-down-right.svg);
    // }

    // @note implement icon on hover with pseudo instead

    // &::after {
    //     content: "";

    //     position: absolute;

    //     right: 0;
    //     bottom: 0;

    //     width: @resizer-sz;
    //     height: @resizer-sz;

    //     background-image: url(/arrow-down-right.svg);
    //     background-size: 1rem 1rem;

    // }

    // @note ok this is a better way to make resizer visible on hover

    &:hover {
        resize: both;
    }
}

canvas {
    // prevent inline bottom margin
    display: block;

    width: 100%;
    height: 100%;
}
</style>
