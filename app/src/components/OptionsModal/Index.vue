<template lang="pug">
.options.CModal__content
  article.App__article(ref="sectionRef")
    h1.App__font-shade.App__icon-title
      gear-icon
      | {{ t("settings") }}
    section.App__section
      h2.App__font-shade.App__icon-title
        server-icon
        | {{ t("app") }}
      .App__section
        label
          input(type="checkbox", v-model="isManualRecompilation")
          | {{ t("manual-recomp") }}
        label
          input(type="checkbox", v-model="settingValues.offlineShare")
          | {{ t("offline-link") }}
        label
          input(type="checkbox", v-model="settingValues.glowUi")
          | Glow UI
          | {{ " " }}
          span.muted {{ t("reload-required") }}
    section.App__section
      h2.App__font-shade.App__icon-title
        note-icon
        | {{ t("editor") }}
      .App__section
        label
          input(type="checkbox", v-model="settingValues.editorMinimap")
          | {{ t("show-minimap") }}
    section.App__section
      h2.App__font-shade.App__icon-title
        log-icon
        | {{ t("formatting") }}
      .App__row
        label
          .CExportModal_Index__label {{ t("print-width") }}
          .App__input-wrap.App__glow-element-wrap
            input.App__glow-element(type="number", v-model="settingValues.printWidth")
        label
          .CExportModal_Index__label {{ t("tab-size") }}
          .App__input-wrap.App__glow-element-wrap
            input.App__glow-element(type="number", v-model="settingValues.tabSize")
    section.App__section
      h2.App__font-shade.App__icon-title
        db-icon
        | {{ t("storage") }}
      .App__section
        label.cdn-input
          .CExportModal_Index__label {{ t("npm") }}
          .App__input-wrap.App__glow-element-wrap
            input.App__glow-element(v-model="settingValues.npmPackageProvider")
        .App__region
          label
            input(type="checkbox", v-model="settingValues.cachePackages")
            | {{ t("cache") }}
            | {{ " " }}
            span.muted {{ t("cache-tip") }}
          div
            b Cache size:
            | {{ " " }}
            | {{ cacheSize }}
          Button.clear-cache-btn(@click="onClearCache")
            template(#icon) 
              delete-icon
            | {{ t("clear-cache") }}
</template>

<script setup lang="ts">
// input npm cdn
// [ ] cache remote packages offline (so you can use the app offline)
// button (clear persistent cache)

import Button from "@/components/MenuBar/Button.vue";

import DeleteIcon from "octicons:trash";
import GearIcon from "octicons:gear";
import ServerIcon from "octicons:server";
import NoteIcon from "octicons:note";
import LogIcon from "octicons:log";
import DbIcon from "octicons:database";

import { getAllSettings, getSetting, setSettings } from "@/settings";
import { watch, onMounted, shallowRef, reactive } from "vue";

import { useI18n } from "petite-vue-i18n";
import { useScreen } from "@/composition/useScreen";

import { isManualRecompilation } from "@/components/InfoBar/InfoBar.vue";
import { clearCache, getCacheSize } from "@/storage2";

const { t, locale } = useI18n();

let cacheSize = $shallowRef<string>("");
const updateCacheSize = () =>
  getCacheSize().then(bytes => (cacheSize = `${(bytes / 1024).toFixed(2)} Kb`));

updateCacheSize();

const settingValues = reactive(getAllSettings());
watch(settingValues, () => setSettings(settingValues));

const screen = useScreen();

watch(
  () => settingValues.editorMinimap,
  async v => {
    const enabled = v && screen.w > 500;

    const { getEditor } = await import("@/editor");

    getEditor().updateOptions({
      minimap: {
        enabled,
      },
    });
  }
);

watch(
  () => settingValues.tabSize,
  async s => {
    console.log("tab update", s);

    const { getEditor, getModel } = await import("@/editor");

    getEditor().updateOptions({
      tabSize: s,
    });

    getModel().updateOptions({ tabSize: s });
  }
);

const onClearCache = async () => {
  await clearCache();
  updateCacheSize();
  alert("Cache has been cleared!");
};
</script>

<style lang="less" module>
.muted {
  color: rgba(160, 160, 160, 0.85);
}

.options {
  // same as for export modal
  font-size: 1.25rem;

  button {
    font-size: 1rem;
  }
}

.cdn-input {
  align-self: stretch;
}

.clear-cache-btn {
  --accent-rgb: 255, 40, 40;

  justify-self: start;
}
</style>
