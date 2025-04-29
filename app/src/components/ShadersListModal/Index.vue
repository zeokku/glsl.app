<template lang="pug">
.list-content.CModal__content
  .content-scroll(ref="scroll")
    article.App__article.content(ref="content")
      h1.App__font-shade.App__icon-title
        sparkles-icon
        | {{ t("your-shaders-title") }}
      section.grid(ref="grid")
        //- iirc :ref cb order is not defined, so use index argument to sync comp refs with shaders data
        Item(
          v-for="[id, view] in Array.from(views)",
          :key="id",
          v-model="view.bbox",
          :name="view.name",
          @click="() => onItemClick(id)",
          @delete="() => onDeleteShader(id)"
        )
        .loading-placeholder.CShadersListModal_Item__item-wrap(v-if="!allShadersLoaded")
          .CShadersListModal_Item__item
            .CShadersListModal_Item__view
            .CShadersListModal_Item__title
              span {{ t("loading") }}
    .spacer(ref="spacer")

  canvas.list-canvas(ref="canvas")
</template>

<script lang="ts">
import type { InjectionKey } from "vue";
import throttle from "lodash.throttle";
import { deleteShader, getAllShaders, getShader, setLastOpenShaderId } from "@/storage2";
import { CLOSE_MODAL } from "../Modal.vue";
import { processIncludes } from "@/processIncludes";
import { useScreen } from "@/composition/useScreen";
import { getLines } from "@/utils/stringUtils";
import { currentShader } from "@/App.vue";
import { isManualRecompilation } from "../InfoBar/InfoBar.vue";
import { useI18n } from "petite-vue-i18n";

export type TBbox = {
  // [k in "x" | "y" | "w" | "h"]: number;
  x: number;
  y: number;
  w: number;
  h: number;
  update(): void;
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
  shallowReactive,
  triggerRef,
  watch,
} from "vue";
import Item from "./Item.vue";

import SparklesIcon from "octicons:sparkles-fill";

import maskShaderCode from "@/squircle.frag?raw";
import defaultVertexShaderCode from "@/default.vert?raw";

interface IView {
  name: string;
  code: Promise<string>;

  bbox?: TBbox;
  program?: WebGLProgram;
  uniforms?: {
    resolution: WebGLUniformLocation;
    time: WebGLUniformLocation;
  };
}

const { t } = useI18n();

const views = shallowReactive(new Map<number, IView>());

const scroll = $shallowRef<HTMLDivElement>();
const content = $shallowRef<HTMLDivElement>();
const grid = $shallowRef<HTMLDivElement>();
const spacer = $shallowRef<HTMLDivElement>();
const canvas = $shallowRef<HTMLCanvasElement>();

// @todo emit('close')
const closeModal = inject(CLOSE_MODAL)!;

const onItemClick = async (id: number) => {
  const shader = await getShader(id);

  const { getModel, processIncludes, compileShader } = await import("@/editor");

  currentShader.value = shader!;

  const model = getModel();
  model.setValue(shader!.code);

  setLastOpenShaderId(shader!.id);

  if (isManualRecompilation.value) {
    const processedCode = await processIncludes(model.getLinesContent());

    compileShader(processedCode);
  }

  closeModal();
};

const onDeleteShader = async (id: number) => {
  await deleteShader(id);

  let removedView = views.get(id);

  // @note update view bboxes going after view being deleted
  const deletedIndex = [...views.keys()].indexOf(id);
  let viewsToUpdate = [...views.values()].slice(deletedIndex + 1);

  views.delete(id);

  if (removedView?.program) disposeProgram(removedView.program);

  // @note wait for dom update after view deletion
  await nextTick();

  viewsToUpdate.forEach(({ bbox }) => bbox?.update());
};

let renderFrame: ReturnType<typeof requestAnimationFrame>;
// @todo how to get a return type of overloaded function with const arg?
// ReturnType<HTMLCanvasElement['getContext']

let allShadersLoaded = $shallowRef<boolean>(false);

let canvasResizeObserver: ResizeObserver;

let gridResizeObserver: ResizeObserver;
let smoothScrollFrame: ReturnType<typeof requestAnimationFrame>;

let gl: WebGL2RenderingContext;
let vertexArray: WebGLVertexArrayObject;
let positionBuffer: WebGLBuffer;
let uvBuffer: WebGLBuffer;

onMounted(async () => {
  gl = canvas!.getContext("webgl2", {
    // @note this is not required hmm
    // alpha: true,
    // @note required so canvas content is blended with html
    premultipliedAlpha: false,
  })!;

  canvasResizeObserver = new ResizeObserver(
    ([
      {
        contentRect: { width, height },
      },
    ]) => {
      canvas!.width = width;
      canvas!.height = height;
    }
  );
  canvasResizeObserver.observe(canvas!);

  let defaultVertexShader = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(defaultVertexShader, defaultVertexShaderCode);
  gl.compileShader(defaultVertexShader);

  let maskShader = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(maskShader, maskShaderCode);
  gl.compileShader(maskShader);

  let maskProgram = gl.createProgram()!;
  gl.attachShader(maskProgram, defaultVertexShader);
  gl.attachShader(maskProgram, maskShader);
  gl.linkProgram(maskProgram);
  const maskResolutionUniform = gl.getUniformLocation(maskProgram, "u_resolution")!;

  const shaders = await getAllShaders();
  const sortedShaders = shaders.sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0));

  for (const { id, name, code } of sortedShaders) {
    views.set(id, {
      name,
      code: processIncludes(getLines(code)),
    });
  }

  // @note before next tick so placeholder is replaced by actual item
  allShadersLoaded = true;

  // @note wait for item refs update after populating views
  await nextTick();

  let scrollY = 0;
  let scrollH = 0;
  {
    // @note update spacer by tracking resize of grid element (since content has height 0 it won't trigger on that element)
    gridResizeObserver = new ResizeObserver(() => {
      spacer!.style.height = content!.scrollHeight + "px";

      // @note must be fetched after we assign spacer height bruh
      scrollH = scroll!.offsetHeight;
    });
    gridResizeObserver.observe(grid!);

    const easeOutCubic = (x: number) => {
      return 1 - Math.pow(1 - x, 3);
    };

    let from = 0;
    let to = 0;
    let progress = 0;
    const duration = 400;

    let prev = performance.now();

    // @note to sync canvas rendering with dom we need to take over scroll
    smoothScrollFrame = requestAnimationFrame(function fn() {
      smoothScrollFrame = requestAnimationFrame(fn);

      let now = performance.now();
      let dt = now - prev;
      prev = now;

      const delta = to - from;

      progress += dt / duration;
      progress = Math.min(1, progress);

      scrollY = from + easeOutCubic(progress) * delta;

      content!.style.translate = `0 -${scrollY}px`;
    });

    let scrollFrameQueued = false;

    scroll!.addEventListener("scroll", e => {
      if (scrollFrameQueued) return;

      requestAnimationFrame(() => {
        scrollFrameQueued = false;

        progress = 0;
        to = (e.target as HTMLElement).scrollTop;
        from = scrollY;
      });
    });
  }

  views.forEach(async view => {
    const code = await view.code;
    let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, code);
    gl.compileShader(fragmentShader);

    let program = gl.createProgram()!;

    // @note we can reuse vertex shader
    gl.attachShader(program, defaultVertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    let linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linkSuccess) {
      console.error(view.name, gl.getProgramInfoLog(program));
      gl.deleteProgram(program);

      return;
    }

    view.program = program;
    view.uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution")!,
      time: gl.getUniformLocation(program, "u_time")!,
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
  gl.enable(gl.BLEND);

  const startTime = performance.now();

  const render = () => {
    renderFrame = requestAnimationFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT);

    views.forEach(view => {
      const {
        bbox: { x, y, w, h },
        program,
        uniforms,
      } = view as Required<IView>;

      if (!program) return;

      let t = scrollY;
      let vh = scrollH;

      const topPadding = 3 * 16;
      const leftPadding = 2 * 16;

      // @note bottom of the view is above the content top
      // @note OR
      // @note top of the view is below the content bottom
      if (y + topPadding + h < t || y + topPadding > t + vh) return;

      gl.viewport(
        x + topPadding,
        // @note viewport's y is inverted relative to DOM y-axis
        gl.canvas.height - y - h + t - leftPadding,
        w,
        h
      );

      gl.useProgram(maskProgram);
      gl.uniform2f(maskResolutionUniform, w, h);

      gl.blendFunc(gl.ONE, gl.ZERO);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // return;

      ////

      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, w, h);
      gl.uniform1f(uniforms.time, (performance.now() - startTime) / 1000);

      gl.blendFuncSeparate(gl.ONE, gl.ZERO, gl.ZERO, gl.ONE);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
  };

  renderFrame = requestAnimationFrame(render);
});

/**
 * @todo Won't it remove vertex too actually?
 * @param program
 */
const disposeProgram = (program: WebGLProgram) => {
  gl.getAttachedShaders(program)!.forEach(shader => {
    gl.deleteShader(shader);
  });

  gl.deleteProgram(program);
};

// @note onbeforeunmount so we disconnect observer before removal of dom elements, so it doesn't fire with 0x0 size
onBeforeUnmount(() => {
  cancelAnimationFrame(renderFrame);
  cancelAnimationFrame(smoothScrollFrame);

  canvasResizeObserver.disconnect();
  gridResizeObserver.disconnect();

  // delete shaders and programs
  views.forEach(view => view.program && disposeProgram(view.program));

  gl.deleteVertexArray(vertexArray);
  gl.deleteBuffer(positionBuffer);
  gl.deleteBuffer(uvBuffer);
});
</script>

<style module lang="less">
.list-content {
  position: relative;

  padding: 0;

  overflow: hidden;

  font-size: 1.25rem;
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

.content {
  position: sticky;
  top: 0;
  height: 0;
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

.loading-placeholder {
  border-radius: var(--br);
  background: linear-gradient(
    90deg,
    rgba(var(--glow-rgb), 0),
    var(--glow),
    rgba(var(--glow-rgb), 0)
  );
  background-size: 200% 100%;

  animation: loading 1500ms infinite linear;

  @keyframes loading {
    0% {
      background-position: 0%;
    }
    100% {
      background-position: 200%;
    }
  }
}
</style>
