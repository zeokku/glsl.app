<template lang="pug">
.export-content.CModal__content(ref="exportContentRef")
  article.App__article
    h1.App__font-shade.App__icon-title
      upload-icon
      | {{ t("export-shader") }}

    section.App__region
      h2.App__font-shade.App__icon-title
        file-icon
        | {{ t("result") }}
      div
        | {{ t("click") }}
        |
        a(:download="currentShader.name + '.glsl'", :href="fileDownloadLink") {{ t("download") }}
      .App__input-wrap.App__glow-element-wrap
        textarea.code(readonly, :value="exportContent", @click="onTextareaClick")

    section.App__section
      h2.App__font-shade.App__icon-title
        gear-icon
        | {{ t("settings") }}
      .App__row-even
        label
          input(type="checkbox", v-model="expandIncludes", @change="generateShader")
          | {{ t("expand") }}
          |
          code #include
          |
          | {{ t("directives") }}
        label
          //- @todo
          input(type="checkbox", v-model="noAngleIncludes", @change="generateShader")
          | {{ t("replace-includes-0") }}
          |
          code(style="text-wrap: nowrap") #include &lt;...&gt;
          | {{ " " }}{{ t("replace-includes-1") }}{{ " " }}
          code(style="text-wrap: nowrap") #include "..."
    section.App__section
      h2.App__font-shade.App__icon-title
        pencil-icon
        | {{ t("rename-symbols") }}
      section.App__region
        h3.App__font-shade {{ t("inputs") }}
        .App__row
          label(v-for="i in inputList")
            .label {{ i }}
            .App__input-wrap.App__glow-element-wrap
              input.App__glow-element(@input="e => renameSymbol(i, e)", :value="renameMap.get(i)")
      section.App__region
        h3.App__font-shade {{ t("uniforms") }}
        .App__row
          label(v-for="i in uniformList")
            .label {{ i }}
            .App__input-wrap.App__glow-element-wrap
              input.App__glow-element(@input="e => renameSymbol(i, e)", :value="renameMap.get(i)")
</template>

<script lang="ts">
// @note module scope, so settings are saved during session

let expandIncludes = $shallowRef<boolean>(false);
let noAngleIncludes = $shallowRef<boolean>(false);

const renameMap = new Map();
</script>

<script setup lang="ts">
import { currentShader } from "@/App.vue";
import UploadIcon from "octicons:upload";
import GearIcon from "octicons:gear";
import PencilIcon from "octicons:pencil";
import FileIcon from "octicons:file";

import { useToast } from "@/composition/useToast";
import type { Uri } from "monaco-editor";

import { useI18n } from "petite-vue-i18n";

const { t, locale } = useI18n();

let exportContentRef = $shallowRef<HTMLDivElement>();

let fileDownloadLink = $shallowRef<string>();
let exportContent = $shallowRef<string>("");

const generateShader = async () => {
  const [{ getModel, processIncludes, dependencyRegex }, { parse, generate }, { renameBindings }] =
    await Promise.all([
      import("@/editor"),
      import("@shaderfrog/glsl-parser"),
      import("@shaderfrog/glsl-parser/utils"),
    ]);

  let codeLines = getModel().getLinesContent();

  if (!expandIncludes && noAngleIncludes) {
    // @note instance it without global flag, because it won't work properly for test()
    let rg = new RegExp(dependencyRegex, "");
    codeLines.forEach((line, index, arr) => {
      if (rg.test(line)) {
        console.log(line);
        arr[index] = line.replace(/<|>/g, '"');
      }
    });
  }

  let code = expandIncludes ? await processIncludes(codeLines) : codeLines.join("\n");

  if (renameMap.size) {
    let ast = parse(code, { includeLocation: true });

    console.log(ast);

    renameBindings(ast.scopes[0], (name, node) => {
      let newName = renameMap.get(name);

      if (newName) return newName;

      return name;
    });

    code = generate(ast);
  }

  exportContent = code;
  fileDownloadLink = URL.createObjectURL(new Blob([code]));
};

generateShader();

// @note offer only inputs rename, since user can rename outputs by themselves
let inputList = ["uv"];
// @todo report, sometimes non reactive vars break for some reason during hot reload (only vite restart helps)
// and it happens after template editing (same goes for components)
let uniformList = ["u_resolution", "u_time", "u_mouse", "u_textures"];

const renameSymbol = (symbol: string, e: InputEvent) => {
  // @todo
  let val = (e.target as HTMLInputElement).value.trim();

  if (val) {
    renameMap.set(symbol, val);
  } else {
    renameMap.delete(symbol);
  }

  generateShader();
};

const onTextareaClick = ({ target }: PointerEvent<HTMLTextAreaElement>) => {
  const { value } = target;

  // @note reset selection first, because if you select the already selected range it will be deselected
  target.setSelectionRange(0, 0);
  target.setSelectionRange(0, value.length);

  navigator.clipboard.writeText(value).then(() => useToast(t("shader-copied")));
};
</script>

<style module lang="less">
// @todo move to modal by default
.export-content {
  max-width: 50rem;

  font-size: 1.25rem;

  & > section {
    margin-block: 3rem;
  }
}

.label {
  margin-bottom: 0.25rem;
}

.code {
  resize: none;

  box-sizing: border-box;
  width: 100%;

  min-height: 20rem;

  font-family: monospace;
  font-size: 1rem;

  cursor: pointer;

  border-radius: calc(var(--br) - var(--bw));
  background: var(--bg);

  transition: outline 300ms ease-out;
  outline: 1px transparent solid;

  &:focus-visible {
    outline: 1px var(--glow) solid;
  }
}
</style>
