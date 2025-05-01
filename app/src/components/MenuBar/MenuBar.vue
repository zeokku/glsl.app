<template lang="pug">
menu.menu(ref="menu")
  //- @note the concept is that focusin for next item will be fired after focusout, so the flag would be set back if focus didn't leave the list/button AND we shouldn't toggle the flag on click, the state is only handled with focus(in/out)
  li(@focusin="isFileMenuShown = true", @focusout="isFileMenuShown = false")
    //- @note pointerdown is fired before focusin, so we can use it to toggle state (comparing to click). it won't close when pop menu item has focus first doe
    Button(@pointerdown="isFileMenuShown = !isFileMenuShown")
      file-open-icon(v-if="isFileMenuShown")
      file-icon(v-else)
      | {{ t("file") }}
      chevron-icon.chevron(:style="{ rotate: (isFileMenuShown ? -180 : 0) + 'deg' }")
    transition(name="fade", style="transition-duration: 300ms")
      menu.pop-menu(v-show="isFileMenuShown", @click="isFileMenuShown = false")
        li
          Button(@click="onNewClick")
            Plus
            | {{ t("new") }}
        li
          Button(@click="onLoadClick")
            FileDirectory 
            | {{ t("load") }}
        li
          Button(@click="onExportClick") 
            Upload
            | {{ t("export") }}
        li
          Button(@click="onShareLinkClick") 
            Link
            | {{ t("share") }}

  li
    Button(@click="onSettingsClick", :title="t('settings')")
      Gear
      .hide-narrow {{ t("settings") }}

  li
    Button(@click="onFullscreenClick", :title="t('fullscreen')")
      ScreenFull
      .hide-narrow {{ t("fullscreen") }}
  //- @todo special button
  //- @todo show full screen animation with hearts on modal open
  li
    Button(style="--accent-rgb: 255, 153, 171", @click="onDonateClick", :title="t('donate')")
      Heart
      .hide-narrow {{ t("donate") }}

  li(@focusin="isInfoMenuShown = true", @focusout="isInfoMenuShown = false")
    Button(@pointerdown="isInfoMenuShown = !isInfoMenuShown", :title="t('info')")
      info-icon
      .hide-narrow {{ t("info") }}
      chevron-icon.chevron(:style="{ rotate: (isInfoMenuShown ? -180 : 0) + 'deg' }")
    transition(name="fade", style="transition-duration: 300ms")
      menu.pop-menu(v-show="isInfoMenuShown", @click="isInfoMenuShown = false")
        li
          Button(@click="onChangelogClick")
            Log
            | {{ t("changelog") }}
        li
          //- @note discord blurple color
          Button(style="--accent-rgb: 88, 101, 242", @click="onDiscordClick")
            //- @todo use discord color, override css vars O_O !!!
            Discord
            | Discord
        li
          Button(@click="onGithubClick")
            Github
            | GitHub

  Modal(
    :visible="modalVisible",
    @close="modalVisible = false",
    @fadeout="currentModalComponent = null"
  )
    component(:is="currentModalComponent")
</template>

<script setup lang="ts">
import Button from "./Button.vue";

import FileIcon from "octicons:file";
import FileOpenIcon from "octicons:file-symlink-file";
import InfoIcon from "octicons:info";
import ChevronIcon from "octicons:chevron-down";

import Plus from "octicons:diff-added";
import FileDirectory from "octicons:file-directory";
import Upload from "octicons:upload";
import Link from "octicons:link";
import ScreenFull from "octicons:screen-full";
import Gear from "octicons:gear";
import Heart from "octicons:heart";
import Discord from "+/icons/discord.vue";
import Github from "+/icons/github.vue";
import Log from "octicons:log";

import Modal from "+/Modal.vue";

import { useI18n } from "petite-vue-i18n";
import { getCanvas } from "../Canvas.vue";

import ShadersList from "+/ShadersListModal/Index.vue";
import ExportModal from "+/ExportModal/Index.vue";
import OptionsModal from "+/OptionsModal/Index.vue";
import DonateModal from "+/DonateModal/Index.vue";
import ChangelogModal from "+/ChangelogModal/Index.vue";

import minShader from "@/min.frag?raw";

import { useToast } from "@/composition/useToast";

import { useMutation } from "@urql/vue";
import { graphql } from "@/gql";
import { getSetting } from "@/settings";
import { currentVersion } from "@/main";
import { currentShader } from "@/App.vue";
import { updateShader } from "@/storage2";
import { onUnmounted } from "vue";

const { t, locale } = useI18n();

let isFileMenuShown = $shallowRef<boolean>(false);
let isInfoMenuShown = $shallowRef<boolean>(false);

const menu = $shallowRef<HTMLMenuElement>();

let modalVisible = $shallowRef<boolean>(false);
let currentModalComponent = $shallowRef<typeof ShadersList>();

const onNewClick = async (e: MouseEvent) => {
  const { getModel, processIncludes, compileShader } = await import("@/editor");

  currentShader.value = await updateShader({
    name: "New Shader",
    code: minShader,
  });

  // @note use min shader when clicking new
  const model = getModel();
  model.setValue(currentShader.value.code);

  compileShader(await processIncludes(model.getLinesContent()));
};

const onLoadClick = () => {
  modalVisible = true;
  currentModalComponent = ShadersList;
};

const OnCtrlS = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.code === "KeyS") {
    e.preventDefault();

    onExportClick();
  }
};
window.addEventListener("keydown", OnCtrlS);

const onExportClick = () => {
  gtagEvent("export_click");

  modalVisible = true;
  currentModalComponent = ExportModal;
};

const { executeMutation } = useMutation(
  graphql(/* GraphQL */ `
    mutation ShareShader($shader: String!, $parentId: ID) {
      shareShader(shader: $shader, parentId: $parentId) {
        id
      }
    }
  `)
);

const onShareLinkClick = async () => {
  const { getModel } = await import("@/editor");

  let code = getModel().getValue();

  if (getSetting("offlineShare")) {
    gtagEvent("share_click");

    const [{ base64urlnopad }, { compress }] = await Promise.all([
      import("@scure/base"),
      import("fflate"),
    ]);

    compress(
      new TextEncoder().encode(code),
      {
        level: 9,
        mem: 12,
      },
      (error, data) => {
        if (error) {
          alert(error);
          return;
        }

        navigator.clipboard
          .writeText("https://glsl.app#" + base64urlnopad.encode(data))
          .then(() => useToast(t("link-copied")));
      }
    );
  } else {
    gtagEvent("share_click", { type: "online" });

    let { data, error } = await executeMutation({ shader: code });

    if (error) {
      alert(error.message);
      return;
    }

    let hash = "~" + data?.shareShader.id;
    location.hash = "#" + hash;

    // @todo store the hash in db for current shader

    navigator.clipboard
      .writeText("https://glsl.app#" + hash)
      .then(() => useToast(t("link-copied")));
  }
};

const onSettingsClick = () => {
  modalVisible = true;
  currentModalComponent = OptionsModal;
};

const onFullscreenClick = () => {
  getCanvas()?.requestFullscreen();
};

const onDonateClick = () => {
  gtagEvent("donate_click");

  modalVisible = true;
  currentModalComponent = DonateModal;
};

const onDiscordClick = () => {
  gtagEvent("discord_click");

  window.open("https://zeokku.com/discord", "_blank");
};

const onGithubClick = () => {
  gtagEvent("github_click");

  window.open("https://github.com/zeokku/glsl.app", "_blank");
};

const onChangelogClick = () => {
  gtagEvent("changelog_click");

  modalVisible = true;
  currentModalComponent = ChangelogModal;
};

//#region show changelog when version updates
const versionKey = "glsl-app-version";

if ((localStorage.getItem(versionKey) ?? "000000") < currentVersion) {
  localStorage.setItem(versionKey, currentVersion);

  modalVisible = true;
  currentModalComponent = ChangelogModal;
}
//#endregion

onUnmounted(() => {
  window.removeEventListener("keydown", OnCtrlS);
});
</script>

<style module lang="less">
.menu {
  display: flex;

  flex: 0 0;
  gap: 1em;

  &,
  menu {
    list-style: none;
  }
}

.pop-menu {
  display: grid;
  gap: 0.5em;

  // @todo there's still an issue due to parent overflow scroll. the pop menu won't adjust its position based on scroll and on narrow screens even when scrolled the menu will be out of bounds
  position: absolute;

  // @note z-index: 5 minimap
  z-index: 10;

  margin-top: 0.5em;
  padding: 0.5rem;
  background: var(--bg);
  border-radius: 0.5rem;
  box-shadow: inset 0px 0px 1.5rem -0.5rem var(--glow);
}

.chevron {
  transition: rotate 200ms ease-out;
}

.hide-narrow {
  @media (width<600px) {
    display: none;
  }
}
</style>
