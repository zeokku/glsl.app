#version 300 es

precision highp float;
precision highp sampler2D;

// normalized coordinates, (0,0) is the bottom left
in vec2 uv;
// resulting fragment color, you may name it whatever you like
out vec4 out_color;

// @note you can hover over symbols, variables, struct types and functions for more info

// size of the canvas in pixels
uniform vec2 u_resolution;
// elapsed time since shader compile in seconds
uniform float u_time;
// mouse pixel coordinates are in canvas space, (0,0) is top left
uniform vec4 u_mouse;
// texture array
uniform sampler2D u_textures[16];


// @note you can include other chunks of code, double quotes are used for absolute HTTP links or relative paths
#include "https://raw.githubusercontent.com/stegu/psrdnoise/main/src/psrdnoise2.glsl"

// @note use angle brackets to include code from an NPM package, in this case we use "lygia"
// you can optionally omit .glsl at the name
#include <lygia/animation/easing/bounce>

// type # to get code suggestions for regions
// the regions are also foldable
#pragma region rotate

vec2 rot(vec2 v, float a){
    return mat2x2(
                cos(a), -sin(a), 
                sin(a), cos(a)
            ) * v;
}

#pragma endregion

void main(){
    vec2 st = uv * vec2(u_resolution.x / u_resolution.y, 1.);
    // @note you can tweak float and vec values
    // try to right click on 8, choose "Tweak Value" (or use a shortcut)
    st = rot(st, -PI / 8.);

    // normalize mouse coordinates
    vec2 mouse = u_mouse.xy / u_resolution;

    vec2 gradient;
    // @note to tweak vectors as a whole, right click on vec2/vec3/vec4, select "Tweak Value"
    // 2D vectors have a convenient point tweaking, while higher order vectors are tweaked by values
    float n = psrdnoise(vec2(3.) * st, vec2(0.), 1.2 * u_time + mouse.y * PI, gradient);

    float lines = cos((st.x + n * 0.1 + mouse.x + 0.2) * PI);

    out_color = vec4(
        mix(
            // @note vec3 and vec4 with normalized values are recognized as colors, 
            // so you can use a color picker to tweak the values
            vec3(0.949, 0.561, 0.576), // rgb(242, 143, 147)
            vec3(0.494, 0.047, 0.839), // rgb(126,  12, 214)
            // @todo try to experiment with functions. How about bounceInOut?
            bounceIn(lines * 0.5 + 0.5)
        ), 
        1.
    );
}