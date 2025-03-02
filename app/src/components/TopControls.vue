<template lang="pug">
div(ref="container")
  .bar-wrap.App__glow-element-wrap
    Menu.bar
  .bar-wrap.App__glow-element-wrap
    Info.bar
</template>

<script setup lang="ts">
import Menu from "./MenuBar/MenuBar.vue";
import Info from "./InfoBar/InfoBar.vue";
</script>

<style module lang="less">
.bar-wrap {
  padding: 0 0 2px !important;

  background-color: var(--border) !important;

  --gr: 5rem !important;

  // @br: 5em;
  // @bd: (2 * @br);

  // @initial: -@br;

  // --mx: @initial;
  // --my: @initial;

  // background-image: radial-gradient(circle, var(--glow), transparent @br);
  // background-size: @bd @bd;
  // background-position: calc(var(--mx) - @br) calc(var(--my) - @br);
  // background-repeat: no-repeat;
}

.bar {
  padding-inline: 1em;
  padding-block: 0.75em;

  margin: 0;

  background-color: var(--bg);

  // @note make it scrollable on narrow layout
  overflow-x: auto;
}
</style>
