<template lang="pug">
.list-content.CModal__content
    .content-scroll(ref="scroll" @scroll="onScroll")
        .grid(ref="grid")
            //- iirc :ref cb order is not defined, so use index argument to sync comp refs with shaders data
            Item(v-for="(name, index) in shaderNames" v-bind="{name}" :ref="(el) => setRef(el, index)" @click="() => onItemClick(name)" @delete="() => onDeleteShader(index)")
    canvas.list-canvas(ref="canvas")
</template>

<script lang="ts">
import type { InjectionKey } from "vue";
import throttle from "lodash.throttle";
import { deleteShader, getAllShaders, getShader, setLastOpenShader } from "@/storage";
import { CLOSE_MODAL } from "../Modal.vue";
import { createdTimestamp, shaderName } from "@/App.vue";
import { processIncludes } from "@/processIncludes";
import { useScreen } from "@/composition/useScreen";
import { getLines } from "@/utils/stringUtils";

export type TBbox = {
  [k in "x" | "y" | "w" | "h"]: number;
};
</script>

<script setup lang="ts">
import {
  inject,
  nextTick,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
  provide,
  triggerRef,
  watch,
} from "vue";
import Item from "./Item.vue";
import { useMouse } from "@/composition/useMouse";
import { updateElGlow } from "@/stylingUtils/updateGlow";

import defaultVertexShaderCode from "@/default.vert?raw";

const closeModal = inject(CLOSE_MODAL)!;

let getModel: () => import("monaco-editor").editor.ITextModel;
import("@/components/Editor.vue").then(module => ({ getModel } = module));

const onItemClick = async (name: string) => {
  if (!getModel) return;

  setLastOpenShader(name);
  shaderName.value = name;

  let { code, created } = (await getShader(name))!;

  getModel().setValue(code);
  createdTimestamp.value = created;

  closeModal();
};

const scroll = $shallowRef<HTMLDivElement>();
const canvas = $shallowRef<HTMLCanvasElement>();

interface IView {
  // @todo bruh why don't emit types are not generated...
  // getBbox: (typeof Item)['getBbox']
  index: number;
  bbox: TBbox;
  program: WebGLProgram;
  uniforms: {
    resolution: WebGLUniformLocation;
    time: WebGLUniformLocation;
  };
}

let viewsArray: (IView | undefined)[] = [];

// @todo isn't it available by default???
// type PromiseResult<T> = T extends Promise<infer U> ? U : never;

let shaderNames = $shallowRef<string[]>([]);

const itemRefs = [] as (typeof Item)[];
const setRef = (item: typeof Item, index: number) => {
  itemRefs[index] = item;
};

onBeforeUpdate(() => {
  itemRefs.length = 0;
});

const onDeleteShader = async (index: number) => {
  deleteShader(shaderNames[index]);

  let [removedView] = viewsArray.splice(index, 1);

  if (removedView) disposeProgram(removedView.program);

  shaderNames.splice(index, 1);
  triggerRef($$(shaderNames));

  await nextTick();

  // update bboxes
  viewsArray.forEach((v, i) => {
    if (!v) return;

    v.bbox = itemRefs[i].bbox;
  });
};

let frame: ReturnType<typeof requestAnimationFrame>;
// @todo how to get a return type of overloaded function with const arg?
// ReturnType<HTMLCanvasElement['getContext']

let gl: WebGL2RenderingContext;
let positionBuffer: WebGLBuffer;
let uvBuffer: WebGLBuffer;
let vertexArray: WebGLVertexArrayObject;

let startTime: number;

const render = () => {
  frame = requestAnimationFrame(render);

  gl.clear(gl.COLOR_BUFFER_BIT);

  viewsArray.forEach((view, index) => {
    if (!view) return;

    let { bbox, program, uniforms } = view;

    // check if visible
    let { scrollTop: t, offsetHeight: vh } = scroll!;
    let { x, y, w, h } = bbox;

    // bottom of the view is above the content top
    // OR
    // top of the view is below the content bottom
    if (y + h < t || y > t + vh) return;

    gl.useProgram(program);

    gl.uniform2f(uniforms.resolution, w, h);
    gl.uniform1f(uniforms.time, (performance.now() - startTime) / 1000);

    gl.viewport(
      x,
      // @note viewport's y is inverted relative to DOM y-axis
      gl.canvas.height - y - h + t,
      w,
      h
    );

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
};

let resizeObserver: ResizeObserver;

const grid = $shallowRef<HTMLDivElement>();

onMounted(async () => {
  gl = canvas!.getContext("webgl2")!;

  resizeObserver = new ResizeObserver(
    ([
      {
        contentRect: { width, height },
      },
    ]) => {
      canvas!.width = width;
      canvas!.height = height;
    }
  );
  resizeObserver.observe(canvas!);

  let defaultVertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(defaultVertexShader, defaultVertexShaderCode);
  gl.compileShader(defaultVertexShader);

  let shadersList = await getAllShaders().then(list =>
    list.sort((a, b) => b[1].created - a[1].created)
  );
  // @note this! the refs will be updated next tick
  shaderNames = shadersList.map(([name]) => name);

  // load includes
  // @todo async load / render
  await Promise.all(
    shadersList.map(async s => {
      // @note proper line split by \r?\n, since when doing just \n it caused regex $ not always match (because of the remaining \r)
      s[1].code = await processIncludes(getLines(s[1].code), null);
    })
  );

  // @note wait for item refs update
  await nextTick();

  viewsArray = shadersList.map(([name, { code }], index) => {
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, code);
    gl.compileShader(fragmentShader);

    let program = gl.createProgram()!;

    // @note @todo bruh it seems like i can't reuse shader object for multiple programs???
    // wait no bruh i'm dumb, other shaders had #includes and failed to compile
    gl.attachShader(program, defaultVertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    let linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linkSuccess) {
      console.log(name, gl.getProgramInfoLog(program));
      gl.deleteProgram(program);

      return;
    }

    return {
      // @ts-ignore
      // ...(itemRefs[index] as { getBbox: () => void }),
      // @note @todo since it's a proxy, spread doesn't work????
      // wait no, for some reason ref fn is called AFTER on mounted... what the hell????
      // @note bruh i forgot the items are created asynchronously thus refs are not available right away, so move this logic into nextTick()

      index,
      bbox: itemRefs[index].bbox,
      program,
      uniforms: {
        resolution: gl.getUniformLocation(program, "u_resolution")!,
        time: gl.getUniformLocation(program, "u_time")!,
      },
    };
  });

  positionBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1,
      -1, // bottom left
      3,
      -1, // bottom right
      -1,
      3, // top left
    ]),
    gl.STATIC_DRAW
  );

  uvBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);

  vertexArray = gl.createVertexArray()!;

  gl.bindVertexArray(vertexArray);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(vertexArray);

  gl.clearColor(0, 0, 0, 0);

  startTime = performance.now();
  frame = requestAnimationFrame(render);
});

const disposeProgram = (program: WebGLProgram) => {
  gl.getAttachedShaders(program)!.forEach(shader => {
    gl.deleteShader(shader);
  });

  gl.deleteProgram(program);
};

// @note onbeforeunmount so we disconnect observer before removal of dom elements, so it doesn't fire with 0x0 size
onBeforeUnmount(() => {
  // delete shaders and programs
  viewsArray.forEach(view => view && disposeProgram(view.program));

  gl.deleteVertexArray(vertexArray);
  gl.deleteBuffer(positionBuffer);
  gl.deleteBuffer(uvBuffer);

  resizeObserver.disconnect();

  cancelAnimationFrame(frame);

  // @todo ??? how th to dispose gl lol
});

//#region border glow

// force update on scroll
const onScroll = () => {
  // @note use grid.children, because they may change
  // and storing children in a var doesn't introduce any perf boost, while greatly increasing the complexity of the code
  [...grid!.children].forEach(e => updateElGlow(e, useMouse(), true));
};

watch(useMouse(), mouse => {
  if (!grid) return;

  // bruh are there a way to get consistent e.offset for only current target element????
  // ok bruh scrap offset, better use bounding rect, since we cache the values anyway, so it's super clean and easy now

  [...grid!.children].forEach(e => updateElGlow(e, mouse));
});

//#endregion
</script>

<style module lang="less">
.list-content {
  position: relative;

  padding: 0;

  overflow: hidden;
}

.content-scroll {
  height: 100%;
  box-sizing: border-box;

  overflow-y: scroll;

  // spacing for scroll bar
  // padding-right: 2rem;
  padding-inline: 3rem;
  padding-block: 2rem 5rem;
}

.grid {
  display: grid;

  flex: 1;

  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: max-content;

  @media (width < 800px) {
    grid-template-columns: 100%;
  }

  justify-items: center;
  gap: 3rem;
}

.list-canvas {
  position: absolute;
  top: 0;

  width: 100%;
  height: 100%;

  pointer-events: none;
}
</style>
