import { Plugin } from "vite";
// @todo it contains js defs but fails when included in ts
import octicons from "@primer/octicons";

export const octiconsPlugin = (): Plugin => ({
  name: "octicons",

  resolveId(source, importer, options) {
    if (source.startsWith("octicons:")) return source;
  },

  load(id, options) {
    if (id.startsWith("octicons:")) {
      const name = id.split(":")[1];

      const octicon = octicons[name as "alert"].heights[16];

      return `
      import { h } from "vue";

      export default ({size}) => h('svg', {
        fill: 'currentColor',
        ...${JSON.stringify(octicon.ast.attributes)},
        ...(size && { width: size, height: size }),
        innerHTML: ${JSON.stringify(octicon.path)}
      });
      `;
    }
  },
});
