const map = {
  dFdy: "dFdx",

  floatBitsToUint: "floatBitsToInt",
  uintBitsToFloat: "intBitsToFloat",

  packSnorm2x16: "packUnorm",
  packUnorm2x16: "packUnorm",

  unpackSnorm2x16: "unpackUnorm",
  unpackUnorm2x16: "unpackUnorm",
};

export const getDocsLinkFor = (name: string) =>
  `https://registry.khronos.org/OpenGL-Refpages/es3.0/html/${map[name] ?? name}.xhtml`;
