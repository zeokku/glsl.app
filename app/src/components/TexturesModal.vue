<template lang="pug">
section.textures-modal.CModal__content(@scroll="onScroll")
  h1.App__font-shade {{ t("textures") }}
  section.CShadersListModal_Index__grid(ref="grid")
    .CShadersListModal_Item__item-wrap.App__glow-element-wrap(v-for="(tex, i) in textureUrlArray")
      //- @note bruh @dragover is required?
      .CShadersListModal_Item__item.App__glow-element(
        @click="openFilePicker(i)",
        @dragover="onDragOver",
        @dragleave="onDragLeave",
        @drop.prevent.stop="onDrop($event, i)"
      )
        component.slot.CShadersListModal_Item__view(
          v-if="tex",
          :ref="el => setTextureSourceRef(el, i)",
          :is="t.isVideo ? 'video' : 'img'",
          :src="tex",
          v-bind.attr=`tex.isVideo && {
                  loop: true,
                  muted: true,
                  autoplay: true,
                  playsinline: true,
                }`
        )
        .slot.CShadersListModal_Item__view(v-else)
          .placeholder
            span
              //- @note because v-for used t as variable it replaced the localization function
              b {{ t("select-media") }}
              |
              | {{ t("or-dnd") }}
        .CShadersListModal_Item__title
          span Texture {{ i }}
</template>

<script lang="ts">
import { shallowReactive, watch } from "vue";
import { glInitialization } from "./Canvas.vue";
import { updateTexture } from "@/gl/glContext";

// 7.3 Built-In Constants
// min guaranteed 16 textures
export const TEXTURE_SOURCES_LENGTH = 16;

export type TTextureSource = HTMLImageElement | (HTMLVideoElement & { raf: number });
// @note shallow because we need to track either initial texture definition
// or change between img/video elements
// src attribute change is handled by onload event, which is registered once when
// the watcher triggers
export const textureSourceRefs = shallowReactive<Array<TTextureSource | undefined>>(
  Array.from({ length: TEXTURE_SOURCES_LENGTH })
);
</script>

<script setup lang="ts">
import { useMouse } from "@/composition/useMouse";
import { updateElGlow } from "@/stylingUtils/updateGlow";
import { useI18n } from "petite-vue-i18n";

const { t } = useI18n();

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.multiple = true;
fileInput.accept = "image/*, video/*";

type TTextureSourceUrl = String & { isVideo?: boolean };
const textureUrlArray = shallowReactive<TTextureSourceUrl[]>(
  Array.from({ length: TEXTURE_SOURCES_LENGTH })
);

const setTextureSourceRef = (el: TTextureSource | null, index: number) => {
  console.log("set ref", el);

  if (el) textureSourceRefs[index] = el;
};

const updateFileUrls = (files: FileList, index: number) => {
  // @note allow multiple files drop, so they will be assigned to next indices
  for (let file of files) {
    if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
      alert(`Slot ${index++} is not a valid texture source!\n${file.type}`);
      continue;
    }

    const url: TTextureSourceUrl = new String(URL.createObjectURL(file));
    url.isVideo = file.type.startsWith("video/");

    textureUrlArray[index++] = url;
  }
};

const onDrop = (e: DragEvent, index: number) => {
  if (e.dataTransfer) {
    updateFileUrls(e.dataTransfer.files, index);
  }

  e.currentTarget.classList.remove($cssModule.dnd);
};

// const onDragEnter = (e: DragEvent) => {
//   e.currentTarget.classList.add($cssModule.dnd);
//   // console.log("dragenter", (e.target as HTMLElement).getAttribute("class")?.toString());
// };

const onDragOver = (e: DragEvent) => {
  // ref: https://stackoverflow.com/questions/8414154/html5-drop-event-doesnt-work-unless-dragover-is-handled#comment118199122_31085796
  // tldr: default behavior is to prevent drop, so preventing this allow drop
  // @note allow drop only when dnding files
  if (e.dataTransfer!.types.includes("Files")) {
    e.preventDefault();

    // console.log("dragover", (e.target as HTMLElement).getAttribute("class")?.toString());
  }

  e.currentTarget.classList.add($cssModule.dnd);
};

const onDragLeave = (e: DragEvent) => {
  // console.log("dragleave", (e.target as HTMLElement).getAttribute("class")?.toString());

  // @note leave is triggered for current wrapper
  // AND next element is not contained within currentTarget
  if (
    e.target === e.currentTarget &&
    !e.currentTarget.contains(e.relatedTarget as HTMLElement | null)
  ) {
    // console.log("true dragleave");
    e.currentTarget.classList.remove($cssModule.dnd);
  }
};

const openFilePicker = (index: number) => {
  fileInput.onchange = e => {
    if (fileInput.files) {
      updateFileUrls(fileInput.files, index);
    }
  };

  fileInput.click();
};

let cachedTextureElements = Array.from<TTextureSource>({ length: 16 });

watch(textureSourceRefs, async () => {
  console.log("watch texture source refs");

  await glInitialization;

  textureSourceRefs.forEach(async (el, i) => {
    // @note the @bug with updating only single element was propagated to entire array
    // was caused by improper Array.fill(["", null])
    // all array elements were assigned to the same tuple reference
    //

    let cachedEl = cachedTextureElements[i];

    // slot is defined and element has been initialized or changed
    // cached and el will be only different if:
    //     1. empty slot is initialized for the first time
    //     2. type of source is changed (img <-> video)
    // subsequent img / video changes won't trigger this code, instead the textures will be updated in on image load / on next frame
    if (el && cachedEl !== el) {
      console.log("Update texture", i, el);

      if (cachedEl && "raf" in cachedEl) {
        console.log("Cancel frame", cachedEl.raf);

        cancelAnimationFrame(cachedEl.raf);
      }

      cachedTextureElements[i] = el;

      const isVideo = (el: HTMLElement): el is HTMLVideoElement & { raf: number } =>
        el.tagName === "VIDEO";

      if (isVideo(el)) {
        const uploadVideoUpdates = () => {
          // @note remove canplay listener, because it will be fired again when video loops
          el.oncanplay = null;

          requestAnimationFrame(async function frame() {
            el.raf = requestAnimationFrame(frame);

            updateTexture(
              // @note for some reason pixelStorei has no effect on this unless we specify flipY in creation options
              await createImageBitmap(el, {
                imageOrientation: "flipY",
              }),
              i
            );
          });
        };

        // @note only either of these should be processed
        // since we update video each frame
        // change of src will be handled automatically
        if (el.readyState === /* HAVE_ENOUGH_DATA */ 4) uploadVideoUpdates();
        else el.oncanplay = uploadVideoUpdates;

        // @note when modal is closed video is automatically paused
        // so force play state when it's paused, so it doesn't pause again
        el.onpause = () => el.play();
      } else {
        // @note if it's already complete, onload won't fire for this image
        if (el.complete)
          updateTexture(
            await createImageBitmap(el, {
              imageOrientation: "flipY",
            }),
            i
          );

        // @note when you change image source, <img> element remains the same
        // only src attribute changes, so onload event will fire again
        el.onload = async () =>
          updateTexture(
            await createImageBitmap(el, {
              imageOrientation: "flipY",
            }),
            i
          );
      }
    }
  });
});

//#region border glow

const grid = $shallowRef<HTMLElement>();

// force update on scroll
const onScroll = () => {
  // @note use grid.children, because they may change
  // and storing children in a var doesn't introduce any perf boost, while greatly increasing the complexity of the code
  [...grid!.children].forEach(e => updateElGlow(e, useMouse(), true));
};

watch(useMouse(), mouse => {
  if (!grid) return;

  // bruh are there a way to get consistent e.offset for only current target element????
  // ok bruh scrap offset, better use bounding rect, since we cache the values anyway, so it's super clean and easy now

  [...grid!.children].forEach(e => updateElGlow(e, mouse));
});

//#endregion
</script>

<style lang="less" module>
.textures-modal {
  // width: 60rem;
  box-sizing: border-box;
}

.slot {
  border-radius: 1rem;

  object-fit: contain;

  cursor: pointer;
}

.placeholder {
  display: grid;

  height: 100%;

  padding: 2rem;
  box-sizing: border-box;

  place-items: center;
  align-items: center;

  background: linear-gradient(var(--bg), var(--glow));

  outline: 2px dashed rgba(var(--border-rgb), 0.5);
  border-radius: inherit;

  transition: outline-offset 300ms;

  &:hover {
    outline-offset: -0.5rem;
  }
}

.dnd .placeholder {
  outline-offset: -0.5rem;
}
</style>
