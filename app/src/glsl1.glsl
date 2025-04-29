// Attribute/Varying replacement
#define attribute in
#define varying out

// Texture lookup replacement
#define texture2D texture
#define textureCube texture

// GLSL 1.20 had gl_FragColor by default
#define gl_FragColor out_color;

// gl_FragDepth unchanged, but can define if needed
// #define gl_FragDepthEXT gl_FragDepth

// GLSL 3 requires explicit precision in ES, define if needed
