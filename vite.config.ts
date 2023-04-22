import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA as pwa } from "vite-plugin-pwa";
import { ssr } from "vite-plugin-ssr/plugin";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";

import cssm from "vite-plugin-vue-css-modules";

import { visualizer } from "rollup-plugin-visualizer";

import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    cssm({
      scriptTransform: true,
    }),
    vue({
      reactivityTransform: true,
    }),
    VueI18nPlugin({
      // @note include is required if using virtual module "...-vue-i18n/messages"
      include: "./src/locales/*.yaml",
      defaultSFCLang: "yaml",
    }),
    pwa({
      registerType: "autoUpdate",
      manifest: {
        name: "GLSL Shader Editor",
        short_name: "GLSL Editor",
        description:
          "Modern GLSL shader editor with syntax highlighting, autocompletion and code includes",
        icons: [
          {
            src: "/icon-512.png",
            type: "image/png",
            sizes: "512x512",
          },
        ],
      },
    }),
    // ssr({
    //   prerender: true,
    // }),

    {
      name: "Add build timestamp",

      resolveId(source, importer, options) {
        if (source === "📅") {
          return {
            id: "📅",
            moduleSideEffects: true,
          };
        }
      },

      load(id, options) {
        if (id === "📅") {
          return "export default " + JSON.stringify(new Date().toLocaleString());
        }
      },
    },

    visualizer({
      filename: "stats-compressed.html",
      gzipSize: true,
      brotliSize: true,
      // sourcemap: true
    }),
  ],

  resolve: {
    alias: [
      {
        find: "@",
        replacement: resolve(__dirname, "src"),
      },
      {
        find: "+",
        replacement: resolve(__dirname, "src/components"),
      },
    ],
  },

  build: {
    // sourcemap: true, // @todo 'hidden'
    minify: "terser",
    terserOptions: {
      mangle: {
        keep_classnames: false,
        keep_fnames: false,
      },
      compress: {
        drop_console: true,
        //passes: 2,
      },
    },
  },

  // build: {
  //   rollupOptions: {
  //     // @fix? [vite-plugin-pwa:build] You must supply options.input to rollup
  //     input: "index.html",
  //   },
  // },
});
