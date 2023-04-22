<template lang="pug">
TopControls
Editor(@change="onShaderCodeChange" v-bind="{ infoLog }")
Canvas(@compile="onShaderCompile" v-bind="{ shaderCode }")
</template>

<script lang="ts">
export let createdTimestamp = shallowRef(Date.now());

// last open shader or new
// hmm will it always be last doe except very first app opening, which should just be the default one? 
export let shaderName = shallowRef<string | null>(
  null
)
</script>

<script setup lang="ts">
import TopControls from './components/TopControls.vue';
import Editor, { getModel } from './components/Editor.vue'
import Canvas from './components/Canvas.vue'
import throttle from 'lodash.throttle';
import debounce from 'lodash.debounce'
import { renameShader, saveShader, getLastOpenShader, setLastOpenShader } from './storage';
import { shallowRef, watch } from 'vue';

let shaderCode = $shallowRef<string>('');
let infoLog = $shallowRef<String>('');
// @todo bruh did smth change in ts, why does it infer type as "0" and not as number
// let compileTimestamp = $shallowRef<number>(0);

// @todo flush on clicking new or exiting the page (use confirm dialog)
const save = debounce(() => {
  let code = getModel().getValue();

  return saveShader(shaderName.value!, {
    // @todo reactive var bug
    created: createdTimestamp.value,
    // modified: Date.now(),
    code
  }).then(() => {
    setLastOpenShader(shaderName.value!)

    console.log(shaderName.value, 'saved')
  })
}, 1000, { trailing: true })

const rename = debounce((newName: string | null, oldName: string | null) => {
  // @note when clicking new, prevent rename
  if (newName === getLastOpenShader() || oldName === null) return;

  return renameShader(getLastOpenShader()!, newName!).then(() => {
    setLastOpenShader(newName!)

    console.log('shader renamed', newName, '<-', getLastOpenShader())
  }).catch(() => {
    alert('Shader with this name already exists! Changes will overwrite old data!');
  })
}, 1000, { trailing: true });

watch(shaderName, rename)

const onShaderCodeChange = (code: string) => {
  shaderCode = code;

  save()
}

const onShaderCompile = (log: string) => {
  // @note a hack to always trigger watcher, even when the string doesn't change
  // since we wrap string in an object, reference changes
  infoLog = new String(log);
}
</script>

<style module lang="less">
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
  // @note 0px is the correct, just 0 won't work
  // @note using % won't be a future proof solution, because size of the glow may be greater than element dimension, thus we can't find such a % mapping that will hide the glow fully (without using stupid values like 9999 and etc.)
  --mx: calc(0px - var(--gr));
  --my: calc(0px - var(--gr));

  // @todo make it brighter on hover?
  // linear-gradient(to bottom, rgba(var(--glow-rgb), 1) 0%, var(--border) 50%, rgba(var(--border-rgb), 0.05) 100%)

  // glow strength
  --gs: 0.3;

  &:hover {
    --gs: 0.4;
  }

  // move border grad 
  background: linear-gradient(to bottom, var(--border) 0%, rgba(var(--border-rgb), 0.05) 100%),
  radial-gradient(circle, rgba(var(--glow-rgb), var(--gs)), transparent var(--gr));

  background-size: 100% 100%,
  var(--gd) var(--gd);

  @glow-position: calc(var(--mx) - var(--gr)) calc(var(--my) - var(--gr));

  background-position: 0 0,
  @glow-position;

  background-repeat: no-repeat;
}

.glow-element {

  // @note @todo normally we should reduce the border-radius of inner element by border width, but it's small enough so we may ignore it
  // @note use inherit so you define radius only on wrap element
  // border-radius: inherit;
  // @note ok bruh let's correct it as on bigger radiuses it's very noticeable
  border-radius: calc(var(--br) - var(--bw));


  font-size: inherit;

  background-image: linear-gradient(to top, rgba(var(--accent-rgb), 0.75), transparent);
  background-size: 100% 200%;
  background-color: var(--bg);
  background-position-y: -100%;
  background-repeat: no-repeat;

  transition: background-position-y 400ms ease-out, outline 300ms ease-out;

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
    width: -webkit-fill-available;
    width: -moz-available;
    width: stretch;

  }
}
</style>

<style lang="less">
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
}

h1 {
  font-size: 1.5em;
}

h2 {
  font-size: 1.2em;
  margin-top: 2.5rem;
}

button {
  appearance: none;
  font-family: inherit;
  font-weight: inherit;
  border: none;

  // @note prevent builtin types overwrite this
  color: inherit;
}

a {
  // -webkit-link
  color: rgb(158, 158, 255);
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

    transition: opacity 400ms, transform 450ms;
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

// @note add a transition for tweakpane button
.tp-btnv_b {
  transition: background 300ms;
  text-transform: uppercase;
}
</style>