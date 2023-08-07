<template lang="pug">
.canvas-wrap(v-movable)
    canvas(ref="canvasRef" @mousemove="onMouseMove" @contextmenu.prevent)
</template>

<script lang="ts">
export let canvasFps = { value: 60 };
// $shallowRef<number>(0)

const setFps = (v: number) => (canvasFps.value = v);
//throttle(v => canvasFps = v, 200);

let canvasRef = $shallowRef<HTMLCanvasElement>();
export let getCanvas = () => canvasRef;
</script>

<script setup lang="ts">
import throttle from "lodash.throttle";
import { onMounted, onUpdated, watch } from "vue";

import defaultVertexShaderCode from "@/default.vert?raw";
import { TEXTURE_SOURCES_LENGTH, TTextureSource, textureSourceRefs } from "./TexturesModal.vue";

const emit = defineEmits<{
  (e: "compile", infoLog: string): void;
}>();

const props = defineProps<{
  shaderCode: string;
}>();

let gl: WebGL2RenderingContext;

let fragmentShader: WebGLShader;

let program: WebGLProgram;

let positionGlBuffer: WebGLBuffer;
let uvGlBuffer: WebGLBuffer;

let vertexArray: WebGLVertexArrayObject;

onMounted(() => {
  gl = canvasRef!.getContext("webgl2")!;

  if (!gl) {
    alert("Update your browser to support WebGL2");
    throw "No WebGL2";
  }

  // @note since we pull data from DOM img element Y axis is inverted
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  gl.clearColor(0, 0, 0, 0);

  //#region vertex shader

  const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;

  // attributes are filled vec4(0, 0, 0, 1) by default
  gl.shaderSource(vertexShader, defaultVertexShaderCode);
  gl.compileShader(vertexShader);

  let compileSuccess = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);

  if (!compileSuccess) {
    console.log("vertex", gl.getShaderInfoLog(vertexShader));
  }

  //#endregion

  //#region program

  fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

  program = gl.createProgram()!;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  //#endregion

  positionGlBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionGlBuffer);
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

  uvGlBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, uvGlBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);

  //#region buffers

  vertexArray = gl.createVertexArray()!;

  gl.bindVertexArray(vertexArray);

  // @note use layout in shader instead
  // let positionLocation = gl.getAttribLocation(program, 'in_position');

  gl.bindBuffer(gl.ARRAY_BUFFER, positionGlBuffer);
  // enable position
  gl.enableVertexAttribArray(0);
  // attrib pointer works on gl.ARRAY_BUFFER
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  ///

  gl.bindBuffer(gl.ARRAY_BUFFER, uvGlBuffer);
  // enable uv
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

  ///

  //#endregion

  const resizeObserver = new ResizeObserver(
    throttle<ResizeObserverCallback>(
      ([
        {
          contentRect: { width, height },
        },
      ]) => {
        canvasRef!.width = width;
        canvasRef!.height = height;

        gl.viewport(0, 0, width, height);
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

let currentFrame: ReturnType<typeof requestAnimationFrame>;

let mouse = { x: 0, y: 0, lb: 0, rb: 0 };

onUpdated(async () => {
  cancelAnimationFrame(currentFrame);

  gl.shaderSource(fragmentShader, props.shaderCode);
  gl.compileShader(fragmentShader);

  let compileSuccess = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);

  if (!compileSuccess) {
    let infoLog = gl.getShaderInfoLog(fragmentShader)!;

    console.log(infoLog);

    emit("compile", infoLog);
    // gl.deleteShader(fragmentShader);

    return;
  }

  emit("compile", "");

  // linking should be performed after both shaders are compiled
  gl.linkProgram(program);

  let linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linkSuccess) {
    console.log(gl.getProgramInfoLog(program));
    // gl.deleteProgram(program);

    return;
  }

  //#endregion

  //#region default uniforms

  let resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  let timeUniformLocation = gl.getUniformLocation(program, "u_time");
  let mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
  let textureArrayUniformLocation = gl.getUniformLocation(program, "u_textures");

  //#endregion

  gl.useProgram(program);

  gl.uniform1iv(
    textureArrayUniformLocation,
    Array.from({ length: TEXTURE_SOURCES_LENGTH }).map((_, i) => i)
  );

  // gl.bindVertexArray(vertexArray);

  let startFrameTime = performance.now();

  let prevFrameTime = startFrameTime;

  currentFrame = requestAnimationFrame(function render() {
    let curFrameTime = performance.now();

    setFps(1000 / (curFrameTime - prevFrameTime));

    prevFrameTime = curFrameTime;

    currentFrame = requestAnimationFrame(render);

    gl.uniform2f(resolutionUniformLocation, canvasRef!.width, canvasRef!.height);
    gl.uniform1f(timeUniformLocation, (curFrameTime - startFrameTime) / 1000);
    // @note oh, so now object keys are ordered by spec
    gl.uniform4f(
      mouseUniformLocation,
      ...(Object.values(mouse) as [number, number, number, number])
    );

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
});

const onMouseMove = ({ offsetX, offsetY, buttons }: MouseEvent) => {
  mouse.x = offsetX;
  mouse.y = offsetY;

  mouse.lb = buttons & 0x1 && 1;
  mouse.rb = buttons & 0x2 && 1;
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
