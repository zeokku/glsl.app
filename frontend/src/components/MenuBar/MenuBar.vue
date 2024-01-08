<template lang="pug">
menu.menu(ref="menu" @scroll="onScroll")
    li
        Button(@click="onNewClick")
            template(#icon) 
                Plus
            | {{t('new')}} 
    li
        Button(@click="onLoadClick")
            template(#icon) 
                FileDirectory 
            | {{ t('load') }}
    li
        Button(@click="onExportClick") 
            template(#icon) 
                Upload
            | {{ t('export') }}
    li
        Button(@click="onShareLinkClick") 
            template(#icon) 
                Link
            | {{ t('share') }}
    li
        Button(@click="onOptionsClick")
            template(#icon) 
                Gear
            | {{ t('options') }}    
    li
        Button(@click="onFullscreenClick")
            template(#icon) 
                ScreenFull
            | {{ t('fullscreen') }}
    //- @todo special button
    //- @todo show full screen animation with hearts on modal open
    li
        Button(style="--accent-rgb: 255, 153, 171;" @click="onDonateClick")
            template(#icon) 
                Heart
            | {{ t('donate') }}
    //- discord blurple // --bg: rgb(88, 101, 242);
    li
        Button(style="--accent-rgb: 88, 101, 242;" @click="onDiscordClick")
            //- @todo use discord color, override css vars O_O !!!
            template(#icon) 
                Discord
            | Discord
    li
        Button(@click="onGithubClick")
            template(#icon) 
                Github
            | GitHub

    li
        Button(@click="onChangelogClick")
            template(#icon)
                Log
            | {{ t('changelog') }}
    Modal(:visible="modalVisible" @close="modalVisible = false")
        component(:is="currentModalComponent")
</template>

<script setup lang="ts">
import Button from "./Button.vue";

import Plus from "+/icons/diff-added.vue";
import FileDirectory from "+/icons/file-directory.vue";
import Upload from "+/icons/upload.vue";
import Link from "+/icons/link.vue";
import ScreenFull from "+/icons/screen-full.vue";
import Gear from "+/icons/gear.vue";
import Heart from "+/icons/heart.vue";
import Discord from "+/icons/discord.vue";
import Github from "+/icons/github.vue";
import Log from "+/icons/log.vue";

import Modal from "+/Modal.vue";

import { getCurrentScope, onMounted, watch } from "vue";
import { useI18n } from "petite-vue-i18n";
import { useMouse } from "@/composition/useMouse";
import { getRadiusOffset, updateElGlow } from "@/stylingUtils/updateGlow";
import { createdTimestamp, shaderName } from "@/App.vue";
import { findNonConflictingName, setLastOpenShader } from "@/storage";
import { getCanvas } from "../Canvas.vue";

import ShadersList from "+/ShadersListModal/Index.vue";
import ExportModal from "+/ExportModal/Index.vue";
import OptionsModal from "+/OptionsModal/Index.vue";
import DonateModal from "+/DonateModal/Index.vue";
import ChangelogModal from "+/ChangelogModal/Index.vue";

import minShader from "@/min.frag?raw";

import { encode85, decode85 } from "@/utils/base85";

import { useToast } from "@/composition/useToast";

import { useMutation } from "@urql/vue";
import { graphql } from "@/gql";
import { getSetting } from "@/settings";

const { t, locale } = useI18n();

let getModel: () => import("monaco-editor").editor.ITextModel;
import("@/components/Editor.vue").then(module => ({ getModel } = module));

const menu = $shallowRef<HTMLMenuElement>();

let modalVisible = $shallowRef<boolean>(false);
let currentModalComponent = $shallowRef<typeof ShadersList>();

let glowItems: HTMLElement[];

onMounted(() => {
  glowItems = [...menu!.children].map(li => li.firstElementChild as HTMLElement);
});

watch(useMouse(), mouse => {
  if (!glowItems) return;

  glowItems.forEach(el => updateElGlow(el, mouse));
});

const onScroll = () => glowItems.forEach(el => updateElGlow(el, useMouse(), true));

const onNewClick = async (e: MouseEvent) => {
  if (!getModel) return;

  createdTimestamp.value = Date.now();
  // using $shallow macro causes a problem that import can't be used as var
  let nextName = await findNonConflictingName();

  // @note first set storage
  setLastOpenShader(nextName);

  shaderName.value = nextName;

  // @note use min shader when clicking new
  getModel().setValue(minShader);
};

const onLoadClick = () => {
  modalVisible = true;
  currentModalComponent = ShadersList;
};

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
  if (!getModel) return;

  let code = getModel().getValue();

  if (getSetting("offlineShare")) {
    gtagEvent("share_click");

    const { compress } = await import("fflate");

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

        // console.log('size reduction:', code.length, '->', data.length, ' :: ', data.length / code.length, "%")

        // @note add padding to fill to mod4 bytes
        let padSize = 4 - (data.length % 4);
        let buf = new Uint8Array(data.length + padSize);

        // @note first byte is pad size, other pad bytes are undefined (most probably zero)
        buf[0] = padSize;
        buf.set(data, padSize);

        let b85 = encode85(buf);

        // {
        //     console.log(b85)
        //     let d85 = decode85(b85)!;
        //     let decomp = decompressSync(d85.slice(d85[0]));
        //     console.log(new TextDecoder().decode(decomp))
        // }

        navigator.clipboard
          .writeText("https://glsl.app#" + b85)
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

const onOptionsClick = () => {
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
const versionKey = "\0glsl-app-version";
/**
 * MMmmPP
 *
 * 010200 = 1.2.0
 */
const currentVersion = "010300";

if ((localStorage.getItem(versionKey) ?? "000000") < currentVersion) {
  localStorage.setItem(versionKey, currentVersion);

  modalVisible = true;
  currentModalComponent = ChangelogModal;
}
//#endregion
</script>

<style module lang="less">
.menu {
  display: flex;

  flex: 0 0;
  gap: 1em;

  list-style: none;
}
</style>
