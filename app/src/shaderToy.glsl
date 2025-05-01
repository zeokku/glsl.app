#define iResolution u_resolution
#define iTime u_time
#define iChannel0 u_textures[0]
#define iChannel1 u_textures[1]
#define iChannel2 u_textures[2]
#define iChannel3 u_textures[3]

void mainImage(out vec4, in vec2);

void main(){
    mainImage(out_color, gl_FragCoord.xy);
}