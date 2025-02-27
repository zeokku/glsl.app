#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 uv;
out vec4 out_color;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec4 u_mouse;
uniform sampler2D u_textures[16];

void main(){
    vec2 st = (2. * uv - 1.) * vec2(u_resolution.x / u_resolution.y, 1.);

    vec2 mouse = u_mouse.xy / u_resolution;

    out_color = vec4(
        0.5 * sin(u_time) + 0.5, 
        abs(st), 
        1.
    );
}