import parsedOpenGLDocs from "./parsedOpenGLDocs";

const uniformDefs = {
  u_resolution: "Size of the canvas in pixels",
  u_time: "Elapsed time since shader compile in seconds",
  // prettier-ignore
  u_mouse: 
  `Mouse information
  
  * \`xy\` - pixel coordinates in canvas space\\
      (0,0) is the top left (DOM coordinates)
  * \`p\`= 1.0 - left button is pressed
  * \`q\`= 1.0 - right button is pressed
  `,
};

export const editorBuiltins = {
  // prettier-ignore
  uv: 
  `Normalized coordinates
  
  (0,0) is the bottom left\\
  (1,1) is the top right`,

  // @note output name can be customized
  "\0out": "Resulting fragment color",

  // uniforms
  ...uniformDefs,
};

// @note https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf
export const glslDictionary = {
  keywords: [
    "uniform",
    "const",
    "break",
    "continue",
    "do",
    "for",
    "while",
    "if",
    "else",
    "switch",
    "case",
    "default",
    "in",
    "out",
    "inout",
    "true",
    "false",
    "invariant",
    "discard",
    "return",
    "struct",
    "precision",
    "highp",
    "mediump",
    "lowp",
    "layout",
    "centroid",
    "flat",
    "smooth",
  ],
  // @note cool idea https://codereview.stackexchange.com/questions/162878/partitioning-an-array-based-on-a-condition-in-javascript

  // eh
  // ...(Object.keys(parsedOpenGLDocs).reduce((list, name) => {
  // list[+k.startsWith('gl_')].push(name);
  // }, [[],[]])),

  builtinFunctions: Object.keys(parsedOpenGLDocs).filter(k => !k.startsWith("gl_")),

  builtinVars: Object.keys(parsedOpenGLDocs).filter(k => k.startsWith("gl_")),

  //   builtinVars: [
  //     // // vertex
  //     // // - in
  //     // "gl_VertexID",
  //     // "gl_InstanceID",
  //     // // - out
  //     // "gl_PerVertex",
  //     // "gl_Position",
  //     // "gl_PointSize",
  //     // "gl_ClipDistance",

  //     // fragment
  //     // - in
  //     "gl_FragCoord",
  //     "gl_FrontFacing",
  //     "gl_PointCoord",

  //     // - out
  //     "gl_FragDepth",

  //     // - opengl es 1
  //     "gl_FragColor",
  //   ],
  pseudoTypeKeywords: [
    // notation types
    // gen types are 1d-4d (both value and vectors are allowed)
    "genType",
    "genIType",
    "genUType",
    "genBType",
    // vec types are 2d-4d
    "vec",
    "ivec",
    "uvec",
    "bvec",
    //
    "mat", // used only in matrixCompMult bruh xd
    //
    "gvec",
    "gvec4",
    "gSampler2D",
    "gsampler2D",
    "gSampler3D",
    "gsampler3D",
    "sampler2DShadow",
    "gsampler2DArray",
    "sampler2DArrayShadow",
    "gsamplerCube",
    "samplerCubeShadow",
  ],
  typeKeywords: [
    // actual types
    "bool",
    "bvec2",
    "bvec3",
    "bvec4",

    "int",
    "ivec2",
    "ivec3",
    "ivec4",

    "mat2",
    "mat2x2",
    "mat2x3",
    "mat2x4",
    "mat3",
    "mat3x2",
    "mat3x3",
    "mat3x4",
    "mat4",
    "mat4x2",
    "mat4x3",
    "mat4x4",

    "sampler2D",
    "sampler3D",
    "samplerCube",
    "sampler2DShadow",
    "samplerCubeShadow",
    "sampler2DArray",
    "sampler2DArrayShadow",
    "isampler2D",
    "isampler3D",
    "isamplerCube",
    "isampler2DArray",
    "usampler2D",
    "usampler3D",
    "usamplerCube",
    "usampler2DArray",

    "uint",
    "uvec2",
    "uvec3",
    "uvec4",

    "float",
    "vec2",
    "vec3",
    "vec4",
    "void",
  ],
  uniforms: Object.keys(uniformDefs),
};
