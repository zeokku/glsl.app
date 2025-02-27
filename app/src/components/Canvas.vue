<template lang="pug">
.canvas-wrap(v-movable:[movable] :class="movable || 'static'")
    canvas(ref="canvasRef" @pointermove="onMouseMove" @contextmenu.prevent)
</template>

<script lang="ts">
export let canvasFps = { value: 60 };

let canvasRef = $shallowRef<HTMLCanvasElement>();
export let getCanvas = () => canvasRef;

export let glInitialization: Promise<any>;
</script>

<script setup lang="ts">
import throttle from "lodash.throttle";
import { onMounted, watchEffect } from "vue";

import { initGl, updateMouse, updateResolution } from "@/gl/glContext";
import { useScreen } from "@/composition/useScreen";

let movable = $shallowRef<boolean>();

const screen = useScreen();

watchEffect(() => {
  movable = screen.w > 500;
});

onMounted(async () => {
  glInitialization = initGl(canvasRef!);

  await glInitialization;

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

let mouse = { x: 0, y: 0, lb: 0, rb: 0 };
const onMouseMove = ({ offsetX, offsetY, buttons, target }: MouseEvent) => {
  mouse.x = offsetX;
  // @note make pointer coords top ascending aligned with glsl coords
  mouse.y = target.scrollHeight - offsetY;

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

.static {
  size: 100% auto;
  aspect-ratio: 16 / 9;

  top: unset;
  bottom: 0;

  pointer-events: none;
}
</style>
