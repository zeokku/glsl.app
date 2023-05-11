<template lang="pug">
.canvas-wrap(v-movable)
    canvas(ref="canvasRef" @mousemove="onMouseMove" @contextmenu.prevent)
</template>

<script lang="ts">
export let canvasFps = { value: 60 };
// $shallowRef<number>(0)

const setFps = (v: number) => canvasFps.value = v;
//throttle(v => canvasFps = v, 200);

let canvasRef = $shallowRef<HTMLCanvasElement>();
export let getCanvas = () => canvasRef;
</script>

<script setup lang="ts">
import throttle from 'lodash.throttle';
import { onMounted, onUpdated } from 'vue';

import defaultVertexShaderCode from '@/default.vert?raw'

const emit = defineEmits<{
    (e: 'compile', infoLog: string): void
}>()

const props = defineProps<{
    shaderCode: string
}>()


let gl: WebGL2RenderingContext;

let fragmentShader: WebGLShader;

let program: WebGLProgram;

let positionGlBuffer: WebGLBuffer
let uvGlBuffer: WebGLBuffer

let vertexArray: WebGLVertexArrayObject;


onMounted(() => {

    gl = canvasRef!.getContext('webgl2')!

    if (!gl) {
        alert('Update your browser to support WebGL2');
        throw "No WebGL2"
    };

    gl.clearColor(0, 0, 0, 0);

    //#region vertex shader

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;

    // attributes are filled vec4(0, 0, 0, 1) by default
    gl.shaderSource(vertexShader, defaultVertexShaderCode)
    gl.compileShader(vertexShader);

    let compileSuccess = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);

    if (!compileSuccess) {
        console.log('vertex', gl.getShaderInfoLog(vertexShader));
    }

    //#endregion

    //#region program

    fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

    program = gl.createProgram()!;

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)

    //#endregion

    positionGlBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionGlBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, // bottom left
        3, -1, // bottom right
        -1, 3 // top left
    ]), gl.STATIC_DRAW);

    uvGlBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvGlBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 0,
        2, 0,
        0, 2
    ]), gl.STATIC_DRAW);



    //#region buffers

    vertexArray = gl.createVertexArray()!


    gl.bindVertexArray(vertexArray);

    // @note use layout in shader instead
    // let positionLocation = gl.getAttribLocation(program, 'in_position');

    gl.bindBuffer(gl.ARRAY_BUFFER, positionGlBuffer);
    // enable position
    gl.enableVertexAttribArray(0);
    // attrib pointer works on gl.ARRAY_BUFFER
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    ///


    gl.bindBuffer(gl.ARRAY_BUFFER, uvGlBuffer);
    // enable uv
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)


    //#endregion


    const resizeObserver = new ResizeObserver(throttle<ResizeObserverCallback>(([{ contentRect: { width, height } }]) => {
        canvasRef!.width = width;
        canvasRef!.height = height;

        gl.viewport(0, 0, width, height)
    }, 100));

    resizeObserver.observe(canvasRef!)
})

let currentFrame: ReturnType<typeof requestAnimationFrame>;

let mouse = { x: 0, y: 0, lb: 0, rb: 0 }

onUpdated(async () => {
    cancelAnimationFrame(currentFrame)

    gl.shaderSource(fragmentShader, props.shaderCode);
    gl.compileShader(fragmentShader);

    let compileSuccess = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);

    if (!compileSuccess) {
        let infoLog = gl.getShaderInfoLog(fragmentShader)!;

        console.log(infoLog);

        emit('compile', infoLog)
        // gl.deleteShader(fragmentShader);

        return;
    }

    emit('compile', '')

    // linking should be performed after both shaders are compiled
    gl.linkProgram(program)

    let linkSuccess = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linkSuccess) {
        console.log(gl.getProgramInfoLog(program));
        // gl.deleteProgram(program);

        return;
    }

    //#endregion

    //#region default uniforms

    let resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution')
    let timeUniformLocation = gl.getUniformLocation(program, 'u_time')
    let mouseUniformLocation = gl.getUniformLocation(program, 'u_mouse')

    //#endregion

    gl.useProgram(program)

    // gl.bindVertexArray(vertexArray);

    let startFrameTime = performance.now();

    let prevFrameTime = startFrameTime;

    currentFrame = requestAnimationFrame(function render() {
        let curFrameTime = performance.now()

        setFps(1000 / (curFrameTime - prevFrameTime))

        prevFrameTime = curFrameTime;

        currentFrame = requestAnimationFrame(render);

        gl.uniform2f(resolutionUniformLocation, canvasRef!.width, canvasRef!.height)
        gl.uniform1f(timeUniformLocation, (curFrameTime - startFrameTime) / 1000);
        // @note oh, so now object keys are ordered by spec
        gl.uniform4f(mouseUniformLocation, ...Object.values(mouse) as [number, number, number, number])

        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.drawArrays(gl.TRIANGLES, 0, 3)
    })

})

const onMouseMove = ({ offsetX, offsetY, buttons }: MouseEvent) => {
    mouse.x = offsetX;
    mouse.y = offsetY;

    mouse.lb = buttons & 0x1 && 1;
    mouse.rb = buttons & 0x2 && 1;
}
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