import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA as pwa } from "vite-plugin-pwa";
import { ssr } from "vite-plugin-ssr/plugin";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import VueMacros from "unplugin-vue-macros/vite";

import { minify as minifyHtml } from "html-minifier-terser";

import cssm, { removeCssModulesChunk } from "vite-plugin-vue-css-modules";

import { visualizer } from "rollup-plugin-visualizer";

import { resolve } from "path";

const title = "Online WebGL (GLSL) Shaders Editor and Playground";
const description =
  "Modern Online WebGL (GLSL) Shaders Editor and Playground. Write shaders with ease thanks to advanced IntelliSense, autocompletion features, composability with shader libraries and a user-friendly interface for tweaking values and colors";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    cssm({
      scriptTransform: true,
    }) as any,

    VueMacros({
      plugins: {
        vue: vue({
          reactivityTransform: true,
        }),
      },
    }),

    // removeCssModulesChunk(),

    VueI18nPlugin({
      // @note include is required if using virtual module "...-vue-i18n/messages"
      include: "./src/locales/*.yaml",
      defaultSFCLang: "yaml",
    }),
    // false &&
    pwa({
      workbox: {
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // @note use slash, because default is /index.html which is incorrect since we use /index.php
        // @note but this https://github.com/vite-pwa/nuxt/issues/53#issuecomment-1615266204
        navigateFallback: undefined,
        globPatterns: ["**/*.{js,wasm,css,jpg,png}"],

        // @note cache localized index, since we have navigateFallback: undefined
        runtimeCaching: [
          {
            // @todo report shorthand urlPattern() will not work
            urlPattern: ({ url }) => {
              return url.pathname === "/";
            },
            handler: "NetworkFirst",
          },
        ],
      },

      manifest: {
        name: title,
        short_name: "GLSL Editor",
        description,
        icons: [
          {
            src: "/icon-512.png",
            type: "image/png",
            sizes: "512x512",
          },
        ],
        theme_color: "#0a0118",
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

    command === "build" && {
      name: "html:index-meta-php",
      async transformIndexHtml(html) {
        return (
          '<? require "seo-header.php" ?>' +
          html
            .replaceAll("%title", "<?=$title?>")
            .replaceAll("%desc", "<?=$desc?>")
            .replaceAll("%img", "https://glsl.app/glsl-app-meta-image.png")
        );
      },
    },

    command === "build" && {
      name: "html:minify",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          return minifyHtml(html, {
            collapseBooleanAttributes: true,
            collapseWhitespace: true,
            decodeEntities: true,
            minifyCSS: true,
            minifyJS: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeRedundantAttributes: true,
          });
        },
      },
    },

    visualizer({
      filename: "stats-compressed.html",
      gzipSize: true,
      brotliSize: true,
      sourcemap: true,
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

  worker: {
    // @note this is required by vite-pwa for workers
    format: "es",
  },

  server: {
    port: 55555,
  },

  publicDir: command === "build" ? false : "public",

  css: {
    lightningcss: {
      // @note for some fucking reason `width: -webkit-fill-available` is removed after minimization !!!
      // @note setting targets didn't change anything
      // targets: browserslistToTargets(browserslist(">= 0.25%")),
    },
  },

  build: {
    cssMinify: "lightningcss",
    sourcemap: "hidden",
    // minify: "terser",
    target: "esnext",
    terserOptions: {
      compress: {
        drop_console: true,
        toplevel: true,
        passes: 2,
      },
    },

    // rollupOptions: {
    //   input: "index.html",
    // },
  },

  envPrefix: ["VITE_", "APP_"],

  // build: {
  //   rollupOptions: {
  //     // @fix? [vite-plugin-pwa:build] You must supply options.input to rollup
  //     input: "index.html",
  //   },
  // },
}));
