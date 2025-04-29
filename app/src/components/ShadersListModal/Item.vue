<template lang="pug">
.item-wrap.App__glow-element-wrap
  .item.App__glow-element
    .view(ref="view")
    .title
      span {{ name }}
      button(
        @click.stop="onDeleteClick",
        :aria-label="t('delete-shader')",
        :title="t('delete-shader')"
      )
        delete-icon.delete
</template>

<script setup lang="ts">
import { useScreen } from "@/composition/useScreen";
import { inject, onBeforeUnmount, onMounted, watch } from "vue";

import DeleteIcon from "octicons:trash";

import { useI18n } from "petite-vue-i18n";

import type { TBbox } from "./Index.vue";

const props = defineProps<{
  name: string;
}>();

const { t } = useI18n();

const emit = defineEmits<{
  delete: [];
}>();

const onDeleteClick = () => {
  if (confirm(`Are you sure you want to delete "${props.name}"?`)) {
    emit("delete");
  }
};

// @todo @report doing $shallowRef()! (to illiminate undefined) leads to an error
const view = $shallowRef<HTMLDivElement>();

const bbox = defineModel<TBbox>();

const updateBbox = () => {
  bbox.value = {
    x: view!.offsetLeft,
    y: view!.offsetTop,
    w: view!.offsetWidth,
    h: view!.offsetHeight,
    update: updateBbox,
  };
};

let resizeObserver: ResizeObserver;

onMounted(() => {
  updateBbox();

  resizeObserver = new ResizeObserver(updateBbox);
  resizeObserver.observe(view!);
});

onBeforeUnmount(() => {
  resizeObserver.disconnect();
});
</script>

<style module lang="less">
.item-wrap {
  width: 100%;
  box-sizing: border-box;

  text-align: center;
  // background-color: rgba(var(--accent-rgb), 0.2);

  --gr: 10rem !important;
  --br: 2rem;

  cursor: pointer;

  // background:
  //     linear-gradient(180deg, var(--border) 0%, rgba(var(--border-rgb), 0.05) 100%);

  // &:hover {
  //     background:
  //         linear-gradient(180deg, var(--border) 0%, rgba(var(--border-rgb), 0.2) 100%);

  // }
}

.item {
  display: flex;
  flex-flow: column;

  box-sizing: border-box;
  overflow: hidden;

  // @todo patch shaders to round top corners
  padding: 1.25rem;

  height: 100%;
}

.view {
  width: 100%;

  aspect-ratio: 6/5;

  // background-color: black;
}

@icon-sz: 1.25em;

.title {
  display: grid;
  // @todo auto expand title
  grid-template-columns: @icon-sz 1fr @icon-sz;
  gap: 0.5em;
  align-items: center;

  flex: 1;

  text-transform: uppercase;

  // padding-block: 1.25rem;
  margin-top: 1.25rem;

  span {
    grid-column: 2;
  }
}

.delete {
  grid-column: 3;

  fill: currentColor;

  color: gray;

  transform-origin: center;

  transition:
    color 300ms ease-out,
    transform 300ms ease;

  &:hover {
    transform: scale(1.05);
    color: hsl(360 69% 50% / 1);
  }

  height: @icon-sz;
  width: @icon-sz;
}
</style>
