#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 uv;
out vec4 out_color;

uniform vec2 u_resolution;

float aastep(float threshold, float value) {
    float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

float roundRect( in vec2 p, in vec2 b , float r)
{
    vec2 d = abs(p) - b + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void main(){
    vec2 st = (2. * uv - 1.) * vec2(u_resolution.x / u_resolution.y, 1.);

    float aspect = 6. / 5.;
    float radiusPx = 2. * 16./ u_resolution.y;

    vec2 size = vec2(6./5., 1.);

    float r = roundRect(st, size, radiusPx);

    float c = 
        length(
            vec2(
              max(
                0., 
                abs(st.x) - (aspect - 1.)
              ),
              st.y
            )
        ) - 1.;
    
    float dist = mix(r, c, 0.02);

    float edge = aastep(0.0, dist);



    out_color = vec4(
        vec3(0.), 
        1. - edge
    );
}