#version 300 es

precision highp float;
precision highp sampler2D;

// Normalized coordinates, (0,0) is at the bottom-left
in vec2 uv;
// Resulting fragment color, you may name it whatever you like — try to right click on it and rename
out vec4 out_color;

// @note You can hover over uniforms, symbols, variables, struct types and functions for more info

// Size of the canvas in pixels
uniform vec2 u_resolution;
// Elapsed time since shader compilation in seconds
uniform float u_time;
// Mouse pixel coordinates — (0,0) is at the bottom-left (hover for more info)
uniform vec4 u_mouse;
// @note You can drag'n'drop images and videos right into the editor and access them from this texture array
uniform sampler2D u_textures[16];


// @note You can include other chunks of code, double quotes are used for absolute HTTP links or relative paths
#include "https://raw.githubusercontent.com/stegu/psrdnoise/main/src/psrdnoise2.glsl"

// @note Use angle brackets to include code from a library or NPM package. In this case we use "lygia".
// You can optionally omit .glsl at the end of filename
#include <lygia/animation/easing/bounce>

// Type # to get code suggestions for regions.
// The regions are also foldable
#pragma region rotate

vec2 rot(vec2 v, float a){
    // @note You can format code by Shift+Alt+F
    // If you want to preserve formatting somewhere, add //prettier-ignore comment before the code like here below:
    //prettier-ignore
    return mat2x2(
            cos(a), -sin(a), 
            sin(a), cos(a)
        ) * v;
}

#pragma endregion

void main(){
    vec2 st = uv * vec2(u_resolution.x / u_resolution.y, 1.);
    // @note You can tweak float and vec values.
    // Try to right click on 4, choose "Tweak Value" (or use a shortcut)
    st = rot(st, -PI / 4.);

    // Normalize mouse coordinates
    vec2 mouse = u_mouse.xy / u_resolution;

    vec2 gradient;
    // @note To tweak vectors as a whole, right click on vec2/vec3/vec4, select "Tweak Value"
    // 2D vectors have a convenient point tweaking, while higher order vectors are tweaked by values
    float n = psrdnoise(vec2(1.5) * st, vec2(0.), 1.2 * u_time + mouse.y * PI, gradient);

    float lines = cos((st.x + n * 0.12 + mouse.x + 0.2) * PI);

    out_color = vec4(
        mix(
            // @note vec3 and vec4 with normalized values are recognized as colors, 
            // so you can use a color picker to tweak the values
            vec3(0.071, 0.071, 0.071), // rgb(18, 18, 18)
            vec3(0.561, 0.380, 0.682), // rgb(143, 96, 173)
            // @todo Try to experiment with functions. How about bounceInOut?
            bounceOut(lines * 0.5 + 0.5)
        ), 
        1.
    );
}