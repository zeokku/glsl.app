import { defineConfig } from "vue-macros";

export default defineConfig({
  // @note the plugin cannot resolve vite aliased import paths (e.g. "@/config/plans"), while this feature is native to Vue's SFC compiler, thus disable it in the plugin https://blog.vuejs.org/posts/vue-3-3#imported-and-complex-types-support-in-macros
  betterDefine: false,
  defineEmit: true,
  shortVmodel: {
    prefix: "::",
  },
});
