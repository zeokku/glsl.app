// @note explicitly import cjs version so it doesn't get bundled twice (mjs here and cjs in plugin-glsl)
import { format, formatWithCursor } from "prettier/standalone.js";
import type { Options as PrettierOptions } from "prettier";
import * as glslPlugin from "prettier-plugin-glsl";
import { getSetting } from "./settings";

export const formatCode = async (code: string) => {
  // @todo this breaks sometimes due to different cursor position, something's with offset
  // const formattingResult = await formatWithCursor(code, {
  //   cursorOffset: offset,
  //   plugins: [glslPlugin],
  //   filepath: "shader.glsl",
  //   ...formatOptions,
  // });

  // return formattingResult;

  const formatted = await format(code, {
    parser: "glsl-parser",
    plugins: [glslPlugin],
    printWidth: getSetting("printWidth"),
    tabWidth: getSetting("tabSize"),
  });

  return { formatted };
};
