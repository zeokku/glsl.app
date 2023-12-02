<template lang="pug">
.canvas-wrap(v-movable)
    canvas(ref="canvasRef" @mousemove="onMouseMove" @contextmenu.prevent :key="canvasKey")
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
import { initGl, updateFragment, updateMouse, updateResolution } from "@/gl/glContext";

const emit = defineEmits<{
    (e: "compile", infoLog: string): void;
}>();

const props = defineProps<{
    shaderCode: string;
}>();

let canvasKey = $shallowRef<string>();

// @note onUpdated may fire before the init finished
let initPromise: Promise<unknown>;

onMounted(async () => {
    initPromise = initGl($$(canvasRef!), $$(canvasKey));

    await initPromise;

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

let currentTexturesDataArray = Array.from({
    length: TEXTURE_SOURCES_LENGTH,
}).map<[el?: TTextureSource, texture?: WebGLTexture]>(() => []);

watch(textureSourceRefs, async () => {
    console.log("watch texture source refs");

    if (!gl) return;

    textureSourceRefs.forEach((el, i) => {
        // @note the @bug with updating only single element was propagated to entire array
        // was caused by improper Array.fill(["", null])
        // all array elements were assigned to the same tuple reference
        let textureData = currentTexturesDataArray[i];
        let [savedEl, texture] = textureData;
        // console.log(i, url, textureData, currentTexturesDataArray);

        // slot is defined and element has been initialized or changed
        if (el && savedEl !== el) {
            console.log("update texture", i, el);

            if (savedEl && "raf" in savedEl) {
                console.log("cancel frame", savedEl.raf);
                cancelAnimationFrame(savedEl.raf);
            }

            textureData[0] = el;

            // @note create new texture units lazily instead of initializing entire array with them from start
            if (!texture) {
                texture = textureData[1] = gl.createTexture()!;

                // select texture unit
                gl.activeTexture(gl.TEXTURE0 + i);
                // bind texture within selected unit
                gl.bindTexture(gl.TEXTURE_2D, texture);
                /*
          from: https://stackoverflow.com/questions/75976623/     how-to-use-gl-texture-2d-array-for-binding-multiple-textures-as-array

          "You also need to set GL_TEXTURE_MAG_FILTER because the initial value of      GL_TEXTURE_MIN_FILTER is GL_NEAREST_MIPMAP_LINEAR. If you don't change it and     don't create mipmaps, the texture will not be "complete" and will not be "shown".     "
        */
                // gl.generateMipmap(gl.TEXTURE_2D);
                // OR
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            }

            const uploadTexture = () => {
                // const { naturalWidth: width, naturalHeight: height } = image;

                gl.activeTexture(gl.TEXTURE0 + i);
                // gl.activeTexture(gl[`TEXTURE${i}`]);

                gl.bindTexture(gl.TEXTURE_2D, texture!);

                gl.texImage2D(
                    //
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    el
                );

                // @note sampler array requires all textures be of the same size???
                // gl.texImage3D(
                //   gl.TEXTURE_2D_ARRAY,
                //   0,
                //   gl.RGBA,
                //   image.naturalWidth,
                //   image.naturalHeight,
                //   1,
                //   0,
                //   gl.RGBA,
                //   gl.UNSIGNED_BYTE,
                //   image
                // );
            };

            const isVideo = (el: HTMLElement): el is HTMLVideoElement & { raf: number } =>
                el.tagName === "VIDEO";

            if (isVideo(el)) {
                const uploadVideoUpdates = () => {
                    // @note remove canplay listener, because it will be fired again when video loops
                    el.oncanplay = null;

                    requestAnimationFrame(function frame() {
                        el.raf = requestAnimationFrame(frame);

                        uploadTexture();
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
                if (el.complete) uploadTexture();

                // @note when you change image source, <img> element remains the same
                // only src attribute changes, so onload event will fire again
                el.onload = uploadTexture;
            }
        }
    });
});

onUpdated(async () => {
    await initPromise;

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
