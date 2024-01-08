<template lang="pug">
.info(ref="info")
    .input-wrap.App__input-wrap.App__glow-element-wrap
        input.name-input.App__glow-element(v-model="shaderName" :title="t('shader-name')")
    
    Button(@click="onTexturesOpen")
        template(#icon) 
            image-icon
        | {{t('textures')}} 
    
    .fps-indicator()
        | FPS: 
        div(ref="fpsPaneContainer")
        //- | {{ 'FPS: ' + canvasFps.toFixed(2) }}
        //- @todo canvas resolution


    Button(@click="onRecompile")
      template(#icon) 
          apps-icon
      | {{ t('compile') }}
    
    label.manual-recompilation
      input(type="checkbox" v-model="isManualRecompilation")
      | {{ t('manual-recomp') }}
    
    Modal(:visible="modalVisible" @close="modalVisible = false")
        textures-modal
</template>

<script lang="ts">
export let isManualRecompilation = shallowRef<boolean>(false);

import { compileShader } from "@/App.vue";
import type { editor as MonacoEditor } from "monaco-editor";

let getModel: () => MonacoEditor.ITextModel;
import("@/components/Editor.vue").then(module => ({ getModel } = module));

let processIncludes: typeof import("@/processIncludes").processIncludes;
import("@/processIncludes").then(module => ({ processIncludes } = module));
</script>

<script setup lang="ts">
/*
shader name
saved status
compile status
fps
*/
import { onMounted, shallowRef, watch } from "vue";

import { shaderName } from "@/App.vue";
import { canvasFps } from "@/components/Canvas.vue";

import { useMouse } from "@/composition/useMouse";
import { updateElGlow } from "@/stylingUtils/updateGlow";

import Button from "+/MenuBar/Button.vue";
import ImageIcon from "+/icons/image.vue";
import AppsIcon from "+/icons/apps.vue";

import Modal from "+/Modal.vue";
import TexturesModal from "+/TexturesModal.vue";

import { useI18n } from "petite-vue-i18n";

let modalVisible = $shallowRef<boolean>(false);

const info = $shallowRef<HTMLDivElement>();
const fpsPaneContainer = $shallowRef<HTMLDivElement>();

const { t } = useI18n();

watch(useMouse(), mouse => {
  if (!info) return;

  // @todo refactor
  let [input, textures, , compile] = info.children;

  updateElGlow(input, mouse);
  updateElGlow(textures, mouse);
  updateElGlow(compile, mouse);
});

onMounted(() => {
  import("tweakpane").then(({ Pane }) => {
    let fpsPane = new Pane({
      container: fpsPaneContainer!,
    });

    let monitor = fpsPane.addMonitor(canvasFps, "value", { view: "graph", min: 20, max: 70 });

    monitor.controller_.view.labelElement.style.display = "none";

    let containerStyle = fpsPaneContainer!.style;

    // til: var() can have a fallback value O_O

    // @note customizing tweakpane
    // @todo for some reason Object.assign doesn't work? or it only works if the property was defined in stylesheet?
    containerStyle.setProperty("--tp-container-horizontal-padding", "0");
    containerStyle.setProperty("--tp-container-vertical-padding", "0");
    // @note label's color uses bg color... so intead of transparent use bg color, so text is visible
    containerStyle.setProperty("--tp-base-background-color", "var(--bg)");
    containerStyle.setProperty("--tp-monitor-background-color", "transparent");
    containerStyle.setProperty("--tp-blade-unit-size", "0.5rem");
  });
});

const onTexturesOpen = () => {
  modalVisible = true;
};

const onRecompile = async () => {
  if (!getModel || !processIncludes) return;

  // @todo refactor Editor
  compileShader(await processIncludes(getModel().getLinesContent()));
};

window.addEventListener("dragenter", () => {
  modalVisible = true;
});
</script>

<style module lang="less">
.info {
  display: flex;
  align-items: center;

  gap: 1rem;

  input {
    text-transform: uppercase;
  }
}

.fps-indicator {
  // font-style: italic;

  display: flex;
  align-items: center;
  gap: 1rem;
}

.input-wrap {
  width: 18em;
}

.manual-recompilation {
  display: flex;
  align-items: center;

  white-space: nowrap;

  text-transform: uppercase;
}
</style>
