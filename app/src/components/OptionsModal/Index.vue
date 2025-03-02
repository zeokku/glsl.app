<template lang="pug">
.options.CModal__content
  section(ref="sectionRef")
    h1.App__font-shade {{ t("options") }}
    section.flex
      label
        input(type="checkbox", v-model="settingValues.offlineShare")
        | {{ t("offline-link") }}
    h2.App__font-shade {{ t("editor") }}
    section.flex
      label
        input(type="checkbox", v-model="settingValues.editorMinimap")
        | {{ t("show-minimap") }}
    h2.App__font-shade {{ t("formatting") }}
    section.flex(style="flex-flow: row")
      label.cdn-input
        .CExportModal_Index__label {{ t("print-width") }}
        .App__input-wrap.App__glow-element-wrap
          input.App__glow-element(type="number", v-model="settingValues.printWidth")
      label.cdn-input
        .CExportModal_Index__label {{ t("tab-size") }}
        .App__input-wrap.App__glow-element-wrap
          input.App__glow-element(type="number", v-model="settingValues.tabSize")
    h2.App__font-shade {{ t("storage") }}
    section.flex
      label.cdn-input
        .CExportModal_Index__label {{ t("npm") }}
        .App__input-wrap.App__glow-element-wrap
          input.App__glow-element(v-model="settingValues.npmPackageProvider")
      label
        input(type="checkbox", v-model="settingValues.cachePackages")
        | {{ t("cache") }}
      Button.clear-cache-btn(@click="clearCache")
        template(#icon) 
          Trash
        | {{ t("clear-cache") }}
</template>

<script setup lang="ts">
// input npm cdn
// [ ] cache remote packages offline (so you can use the app offline)
// button (clear persistent cache)

import Button from "@/components/MenuBar/Button.vue";
import Trash from "@/components/icons/trash.vue";

import { getAllSettings, getSetting, setSettings } from "@/settings";
import { watch, onMounted, shallowRef, reactive } from "vue";

import { useMouse } from "@/composition/useMouse";
import { updateElGlow } from "@/stylingUtils/updateGlow";

import { useI18n } from "petite-vue-i18n";
import { clearPersistentCache } from "@/includesOfflineCache";
import { getEditor, getModel } from "../Editor.vue";
import { useScreen } from "@/composition/useScreen";

const { t, locale } = useI18n();

const settingValues = reactive(getAllSettings());
watch(settingValues, () => setSettings(settingValues));

const screen = useScreen();

watch(
  () => settingValues.editorMinimap,
  v => {
    const enabled = v && screen.w > 500;

    getEditor().updateOptions({
      minimap: {
        enabled,
      },
    });
  }
);

watch(
  () => settingValues.tabSize,
  s => {
    console.log("tab update", s);

    getEditor().updateOptions({
      tabSize: s,
    });

    getModel().updateOptions({ tabSize: s });
  }
);

const clearCache = () => {
  clearPersistentCache();
  alert("Cache has been cleared!");
};

let sectionRef = $shallowRef<HTMLDivElement>();

// @todo isolate into module
let glowItems: NodeListOf<HTMLDivElement>;

onMounted(() => {
  glowItems = sectionRef!.querySelectorAll<HTMLDivElement>(
    "." + $cssModule["App__glow-element-wrap"]
  );
});

watch(useMouse(), mouse => {
  if (!glowItems) return;
  glowItems.forEach(g => updateElGlow(g, mouse));
});
</script>

<style lang="less" module>
.options {
  // same as for export modal
  font-size: 1.25rem;

  button {
    font-size: 1.1rem;
  }
}

.flex {
  display: flex;
  flex-flow: column;
  align-items: flex-start;
  gap: 2rem;
}

.cdn-input {
  align-self: stretch;
}

.clear-cache-btn {
  --accent-rgb: 255, 40, 40;
}
</style>
