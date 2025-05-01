<template lang="pug">
.info(ref="info")
  .input-wrap.App__input-wrap.App__glow-element-wrap
    input.name-input.App__glow-element(
      v-model="currentShader.name",
      :title="t('shader-name-tooltip') + (currentShader.name ? `:\n\n` + currentShader.name.toUpperCase() : '')",
      :placeholder="t('shader-name-placeholder')"
    )

  Button(@click="onTexturesOpen", :title="t('textures')")
    image-icon
    .CMenuBar_MenuBar__hide-narrow {{ t("textures") }}

  .App__glow-element-wrap(style="border-radius: 0.5rem")
    .fps-indicator
      | FPS:
      //- | {{ " " }}
      //- span(style="font-family: monospace; font-size: 1rem") {{ Math.round(canvasFps) }}
      .fps-graph(ref="fpsPaneContainer")
      //- @todo canvas resolution

  Button(v-if="isManualRecompilation", @click="onRecompile", :title="t('compile')")
    compile-icon
    .CMenuBar_MenuBar__hide-narrow {{ t("compile") }}

  Modal(:visible="textureModalVisible", @close="textureModalVisible = false")
    textures-modal
</template>

<script lang="ts">
export const isManualRecompilation = shallowRef<boolean>(getSetting("manualRecompilation"));
</script>

<script setup lang="ts">
/*
shader name
saved status
compile status
fps
*/
import { onMounted, shallowRef, watch } from "vue";

import { currentShader } from "@/App.vue";
import { canvasFps } from "@/components/Canvas.vue";

import Button from "+/MenuBar/Button.vue";
import ImageIcon from "octicons:image";
import CompileIcon from "octicons:package-dependencies";

import Modal from "+/Modal.vue";
import TexturesModal from "+/TexturesModal.vue";

import { useI18n } from "petite-vue-i18n";
import { getSetting, setSettings } from "@/settings";

let textureModalVisible = $shallowRef<boolean>(false);

const info = $shallowRef<HTMLDivElement>();
const fpsPaneContainer = $shallowRef<HTMLDivElement>();

const { t } = useI18n();

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
  textureModalVisible = true;
};

const onRecompile = async () => {
  const { getModel, compileShader, processIncludes } = await import("@/editor");

  compileShader(await processIncludes(getModel().getLinesContent()));
};

watch(isManualRecompilation, manualEnabled => {
  setSettings({ manualRecompilation: manualEnabled });

  if (manualEnabled) return;

  // @note recompile when manual is disabled
  onRecompile();
});

window.addEventListener("dragenter", (e: DragEvent) => {
  if (e.relatedTarget !== null) return;
  if (e.dataTransfer?.types?.[0] !== "Files") return;

  textureModalVisible = true;
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
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;

  background-color: var(--bg);

  display: flex;
  align-items: center;
  gap: 1rem;
}

.fps-graph {
  width: 10rem;

  @media (width < 600px) {
    width: 5em;
  }
}

.input-wrap {
  min-width: 18em;

  @media (width<600px) {
    min-width: 10em;
  }
}

:global(.tp-lblv_v) {
  width: 100% !important;
}
</style>
