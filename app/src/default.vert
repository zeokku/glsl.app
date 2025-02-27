#version 300 es

layout(location = 0) in vec4 in_position;
layout(location = 1) in vec2 in_uv;

out vec2 uv;

void main(){
    gl_Position = in_position;

    uv = in_uv;
}