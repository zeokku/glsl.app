import defaultVertexShaderCode from "@/default.vert?raw";

export let canvasFps = { value: 60 };
const setFps = (v: number) => (canvasFps.value = v);

let gl: WebGL2RenderingContext;

let positionGlBuffer: WebGLBuffer;
let uvGlBuffer: WebGLBuffer;

let vertexArray: WebGLVertexArrayObject;

let fragmentShader: WebGLShader;

let program: WebGLProgram;

export const init = (ctx: WebGL2RenderingContext) => {
  gl = ctx;

  // @note since we pull data from DOM img element Y axis is inverted
  // @note @todo for some reason this has no effect if using ImageBitmap as texture source
  // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

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
};

export const updateResolution = (width: number, height: number) => {
  gl.canvas.width = width;
  gl.canvas.height = height;

  gl.viewport(0, 0, width, height);
};

let mouse = { x: 0, y: 0, lb: 0, rb: 0 };
export const updateMouse = (m: typeof mouse) => (mouse = m);

let currentFrame: ReturnType<typeof requestAnimationFrame>;

export const updateFragment = (source: string) => {
  cancelAnimationFrame(currentFrame);

  gl.shaderSource(fragmentShader, source);
  gl.compileShader(fragmentShader);

  let compileSuccess = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);

  if (!compileSuccess) {
    let infoLog = gl.getShaderInfoLog(fragmentShader)!;

    console.log(infoLog);

    // emit("compile", infoLog);
    // gl.deleteShader(fragmentShader);

    return infoLog;
  }

  // emit("compile", "");

  // linking should be performed after both shaders are compiled
  gl.linkProgram(program);

  let linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linkSuccess) {
    let infoLog = gl.getProgramInfoLog(program);

    console.log(infoLog);
    // gl.deleteProgram(program);

    return infoLog;
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

    // import { TEXTURE_SOURCES_LENGTH } from "./TexturesModal.vue";
    Array.from({ length: /* TEXTURE_SOURCES_LENGTH */ 16 }).map((_, i) => i)
  );

  // gl.bindVertexArray(vertexArray);

  let startFrameTime = performance.now();

  let prevFrameTime = startFrameTime;

  currentFrame = requestAnimationFrame(function render() {
    let curFrameTime = performance.now();

    setFps(1000 / (curFrameTime - prevFrameTime));

    prevFrameTime = curFrameTime;

    currentFrame = requestAnimationFrame(render);

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(timeUniformLocation, (curFrameTime - startFrameTime) / 1000);
    // @note oh, so now object keys are ordered by spec
    gl.uniform4f(
      mouseUniformLocation,
      ...(Object.values(mouse) as [number, number, number, number])
    );

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
};

/**
 * index -> WebGLTexture
 */
let currentTexturesArray = Array.from<WebGLTexture>({
  length: /* TEXTURE_SOURCES_LENGTH */ 16,
});

export const updateTexture = (image: ImageBitmap, index: number) => {
  let texture = currentTexturesArray[index];

  // @note create new texture units lazily instead of initializing entire array with them from start
  if (!texture) {
    texture = currentTexturesArray[index] = gl.createTexture()!;

    // select texture unit
    gl.activeTexture(gl.TEXTURE0 + index);
    // bind texture within selected unit
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    ////

    // @note mag only accepts linear or nearest, and default is linear
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    /*
  from: https://stackoverflow.com/questions/75976623/     how-to-use-gl-texture-2d-array-for-binding-multiple-textures-as-array

  "You also need to set GL_TEXTURE_MAG_FILTER because the initial value of      GL_TEXTURE_MIN_FILTER is GL_NEAREST_MIPMAP_LINEAR. If you don't change it and     don't create mipmaps, the texture will not be "complete" and will not be "shown".     "
*/
    // gl.generateMipmap(gl.TEXTURE_2D);
    // OR

    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  // const { naturalWidth: width, naturalHeight: height } = image;

  gl.activeTexture(gl.TEXTURE0 + index);
  // gl.activeTexture(gl[`TEXTURE${i}`]);

  gl.bindTexture(gl.TEXTURE_2D, texture!);

  gl.texImage2D(
    //
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    image
  );

  // @note https://registry.khronos.org/webgl/specs/latest/2.0/#5.41
  // it should have non 0x0 texture at the base level
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 1);

  // @note controls max level of detail during mipmap generation
  // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 4);

  // @note apparently this only limits lods during rendering but not generation
  // gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_LOD, 2);
  // gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAX_LOD, 7);

  // @note generate mipmaps after data is loaded
  performance.mark("before-mipmap");

  gl.generateMipmap(gl.TEXTURE_2D);

  performance.mark("after-mipmap");

  console.log(performance.measure("mipmap", "before-mipmap", "after-mipmap"));

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
