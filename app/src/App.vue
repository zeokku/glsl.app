<template lang="pug">
TopControls
Suspense
  Editor
  //- @note for testing loading anim
  //- Component(:is="_DUMMY_ASYNC_")
  template(#fallback)
    .editor-loading
      | Editor is loading
      .loading-indicator ...
Canvas
</template>

<script lang="ts">
// var _DUMMY_ASYNC_ = defineAsyncComponent(async () => {
//     return new Promise(() => {});
// });

export const currentShader = ref<IShader>({} as IShader);
export const infoLog = shallowRef<string>("");
</script>

<script setup lang="ts">
import TopControls from "./components/TopControls.vue";
import Canvas from "./components/Canvas.vue";
import { shallowRef, watch, defineAsyncComponent, ref } from "vue";

import { initGlowElements } from "./stylingUtils/glow";
import { getSetting } from "./settings";
import { type IShader, setLastOpenShaderId, updateShader } from "./storage2";

const Editor = defineAsyncComponent(() => import("@/components/Editor.vue"));

let saveTimeout: ReturnType<typeof setTimeout>;
const onUnloadPrevent = (e: Event) => e.preventDefault();

/**
 * Debounced by default and prevents unload event unless finished saving. Use `immediate = true` when needed to update shader right away (e.g. when opening another shader, creating new shader and etc)
 * @param immediate
 */
const saveShader = async (immediate?: true) => {
  clearTimeout(saveTimeout);

  window.addEventListener("unload", onUnloadPrevent);

  // @note clone to avoid race condition isues
  const shader = { ...currentShader.value! };

  const save = async () => {
    const { id } = await updateShader(shader);

    setLastOpenShaderId(id);

    window.removeEventListener("unload", onUnloadPrevent);
  };

  if (immediate) {
    return save();
  } else {
    const { promise, resolve } = Promise.withResolvers<void>();

    saveTimeout = setTimeout(() => {
      resolve(save());
    }, 500);

    return promise;
  }
};

// @note watcher is deep by default for reactive objects (so it will work on ref.value lol) but not for refs directly - use deep. deep level is relative to ref's value (.value itself is not counted)
// @note watch only for code and name because it was looped when watching for entire ref object (when assigning created/modified timestamp when saving shader)

watch([() => currentShader.value.name, () => currentShader.value.code], () => saveShader());

// watch(
//   () => currentShader.value?.code,
//   code => {
//     if (isManualRecompilation.value || !code) return;

//     compileShader(code);
//   }
// );

// @note don't enable on touch screen devices
if (matchMedia("(hover:hover)").matches && getSetting("glowUi")) {
  initGlowElements([$cssModule["App__glow-element-wrap"], $cssModule["CModal__window"]]);
}
</script>

<style module lang="less">
.editor-loading {
  flex-grow: 1;

  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.loading-indicator {
  display: inline-block;

  // @note using jump none requires adding extra step, since it holds at 0
  animation: loading 1s steps(4, jump-none) infinite;

  @keyframes loading {
    0% {
      clip-path: inset(0 100% 0 0);
    }

    100% {
      clip-path: inset(0 0% 0 0);
    }
  }
}

.glow-element-wrap {
  --gr: 3rem;
  --gd: calc(2 * var(--gr));

  // --br: ;
  border-radius: var(--br);

  --bw: 2px;
  padding: var(--bw);

  // initial pos hidden
  // @note exprs are not evaluated for css vars
  // @initial: -@br;

  // @todo is there no easier way to inverse?
  // !@note 0px is the correct, just 0 won't work
  // @note using % won't be a future proof solution, because size of the glow may be greater than element dimension, thus we can't find such a % mapping that will hide the glow fully (without using stupid values like 9999 and etc.)
  --mx: calc(0px - var(--gr));
  --my: calc(0px - var(--gr));
  --sx: var(--scroll-x, 0px);
  --sy: var(--scroll-y, 0px);

  // @todo make it brighter on hover?
  // linear-gradient(to bottom, rgba(var(--glow-rgb), 1) 0%, var(--border) 50%, rgba(var(--border-rgb), 0.05) 100%)

  // glow strength
  --gs: 0.3;

  &:hover {
    --gs: 0.4;
  }

  // move border grad
  background:
    linear-gradient(to bottom, var(--border) 0%, rgba(var(--border-rgb), 0.05) 100%),
    radial-gradient(circle, rgba(var(--glow-rgb), var(--gs)), transparent var(--gr));

  background-size:
    100% 100%,
    var(--gd) var(--gd);

  @glow-position: calc(var(--mx) - var(--gr) + var(--sx)) calc(var(--my) - var(--gr) + var(--sy));

  background-position:
    0 0,
    @glow-position;

  background-repeat: no-repeat;

  will-change: background-position;
}

.glow-element {
  // @note correct radius, inner radius is smaller than outer one
  border-radius: calc(var(--br) - var(--bw));

  font-size: inherit;

  background-image: linear-gradient(to top, rgba(var(--accent-rgb), 0.75), transparent);
  background-size: 100% 200%;
  background-color: var(--bg);
  background-position-y: -100%;
  background-repeat: no-repeat;

  transition:
    background-position-y 300ms ease-out,
    outline 300ms ease-out;

  &:hover {
    background-position-y: 0%;
  }

  &:focus {
    background-position-y: 25%;
  }

  // fill the button on click
  // @note don't override input focus state on click
  &:not(input):active {
    background-position-y: 100%;
  }

  outline: 1px transparent solid;

  &:focus-visible {
    outline: 1px var(--glow) solid;
  }
}

// @note top level wrapper element, h1
.article {
  display: grid;
  gap: 2em;
}

// @note children of article, h2
.section {
  display: grid;
  gap: 1.5em;
}

// @note children of section, h3
.region {
  display: grid;
  gap: 1em;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
}

.row-even {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 1em;
}

.icon-title {
  display: flex;
  gap: 0.5ch;
  align-items: center;

  svg {
    width: 1em;
    height: 1em;

    flex-shrink: 0;
  }
}

.font-shade {
  background-image: radial-gradient(ellipse at top, var(--shade), transparent);

  background-color: white;

  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.font-shade-linear {
  background-image: linear-gradient(to bottom, var(--shade), transparent);

  background-color: white;

  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.input-wrap {
  --br: 0.5rem;
  --gr: 5rem;

  input,
  textarea {
    display: block;

    padding: 0.5rem 0.75rem;

    border: none;

    // https://caniuse.com/mdn-css_properties_width_stretch
    // @note this gets removed by lightningcss if vite target is esnext, which causes vite to pass empty object to lightningcss target option, which in turn removes all non standard values, which doesn't seem like correct behavior
    width: -webkit-fill-available;
    width: -moz-available;
    width: stretch;
  }

  // @note Remove arrows. Interestingly hovering over input field with arrows enabled causes content expansion in modal?
  input[type="number"] {
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    -moz-appearance: textfield;
  }
}
</style>

<style lang="less">
:root {
  font-family:
    Open sans,
    sans-serif;
}

#app {
  display: flex;
  flex-flow: column;
}

h1,
h2,
h3 {
  text-transform: uppercase;
  font-weight: bold;

  width: fit-content;

  margin: 0;
}

h1 {
  font-size: 1.5em;
}

h2 {
  font-size: 1.2em;
}

h3 {
  font-size: 1em;
}

// p {
//   @note !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! monaco lost \n\n spaces because markdown parsed it into <p> and i set margin to 0!!!
//   margin: 0;
// }

button {
  appearance: none;

  padding: 0;
  border: none;

  cursor: pointer;

  font: inherit;

  // @note prevent builtin types overwrite this
  color: inherit;

  background: none;

  &:focus-visible {
    // @include outline();
  }

  &:disabled {
    cursor: not-allowed;
  }
}

textarea {
  color: inherit;
}

input {
  font-family: inherit;
  font-weight: inherit;

  color: var(--shade-solid);
}

input[type="checkbox"] {
  appearance: none;

  position: relative;

  vertical-align: text-bottom;

  height: 1.5em;
  width: 1.5em;

  margin-inline: 0 0.75em;

  transition: background 300ms;

  background-color: var(--bg);

  border: 1px solid rgba(var(--border-rgb), 0.5);
  border-radius: 0.25em;
  box-sizing: border-box;

  &::after {
    // https://primer.style/design/foundations/icons/check-16/
    content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="100%" height="100%" fill="white"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>');

    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;

    transition:
      opacity 400ms,
      transform 450ms;
    transform-origin: center center;

    opacity: 0;
    transform: scale(0);
  }

  &:checked {
    background-color: var(--accent);

    &::after {
      opacity: 1;
      transform: scale(1);
    }
  }
}

:root {
  // text shade
  --shade-rgb: 193, 193, 193;
  --shade: rgb(var(--shade-rgb));

  // @note shade is 50% transparent at center
  @shade-solid-c: (193 + 255) / 2;
  --shade-solid: rgb(@shade-solid-c, @shade-solid-c, @shade-solid-c);

  // main border color
  --border-rgb: 169, 163, 194;
  --border: rgba(var(--border-rgb), 0.2);

  // border glow
  --glow-rgb: 255, 255, 255;
  --glow: rgba(var(--glow-rgb), 0.3);

  // main bg color
  --bg-rgb: 10, 1, 24;
  // --bg-rgb: 35, 0, 6;
  --bg: rgb(var(--bg-rgb));

  --accent-rgb: 119, 51, 220; // purple
  // --accent-rgb: 159, 100, 112; // pinkish
  --accent: rgb(var(--accent-rgb));

  //
}

::selection {
  background-color: var(--accent);

  // @note fix selection for gradient texts
  -webkit-text-fill-color: white;
  color: white;
}

::-webkit-scrollbar {
  background-color: var(--border);

  border-radius: 3px;

  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-corner {
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(var(--accent-rgb), 0.5);

  border-radius: 3px;
}

code {
  margin-inline: 0.5ch;
}

svg {
  fill: currentColor;
}

// @note add a transition for tweakpane button
.tp-btnv_b {
  transition: background 300ms;
  text-transform: uppercase;
}
</style>
