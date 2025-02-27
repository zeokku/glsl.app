/// <reference lib="webworker" />

import { parse } from "@shaderfrog/glsl-parser";

onmessage = ({ data: code }) => {
  try {
    let ast = parse(code, { includeLocation: true });

    // @note we can't transfer regular objects
    postMessage(ast);
  } catch {
    postMessage(null);
  }
};
