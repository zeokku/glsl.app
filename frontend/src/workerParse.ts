import { parse } from "@shaderfrog/glsl-parser";

self.onmessage = ({ data: code }) => {
    try {
        let ast = parse(code, { includeLocation: true });

        // @note we can't transfer regular objects
        self.postMessage(ast);
    } catch {
        self.postMessage(null);
    }
};
