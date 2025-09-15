<template lang="pug">
//- @note DO NOT USE @keypress (doesn't work)
//- .prevent for preventing scroll with arrow keys
//- https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-scrollable/
//- order of events !!! mousedown, focus, mouseup, click !!!
//- for proper logic without conflicts we need to use mousedown instead of click !!!
ul.select(
  :class="showOptions && 'options-shown'",
  role="listbox",
  :aria-activedescendant="'--so' + instanceId + '-' + selectedIndex",
  @keydown.space.enter.prevent="showOptions = !showOptions",
  @mousedown="showOptions = !showOptions",
  @focus="showOptions = true",
  @blur="showOptions = false",
  @keydown.up.prevent="selectPrev",
  @keydown.down.prevent="selectNext",
  @keydown.home.prevent="model = entries.at(0)[1]",
  @keydown.end.prevent="model = entries.at(-1)[1]",
  tabindex="0"
)
  .current.App__input(:class="showOptions && 'options-shown'")
    span(:class="{ placeholder: !selectedLabel }") {{ selectedLabel ?? $t("select-value") }}
    chevron-down-icon(:style="{ rotate: showOptions ? '180deg' : '', transition: '200ms' }")
  transition(name="dropdown-toggle") 
    .options(v-show="showOptions", :class="showOptions && 'options-shown'", ref="optionsDom") 
      li.option(
        v-for="([title, value], i) in entries",
        :--id="'--so' + instanceId + '-' + i",
        :class="value === model && 'focused'",
        role="option",
        :aria-selected="value === model ? 'true' : 'false'",
        @mousedown="model = value"
      ) {{ title }}
</template>

<script lang="ts">
let dropdownCounter = 0;
</script>

<script setup lang="ts">
import ChevronDownIcon from "octicons:chevron-down";
import { nextTick, watch } from "vue";

let instanceId = (dropdownCounter += 1);

const props = defineProps<{
  /**
   * Value can be any type while label is a string
   *
   * { [label]: value }
   */
  entries: Record<string, any> | Array<string>;
}>();

/**
 * Array<label, value>
 */
const entries = $computed(() =>
  Array.isArray(props.entries) ? props.entries.map(v => [v, v]) : Object.entries(props.entries)
);

const model = defineModel<any>();

/**
 * depends on model value
 */
const selectedIndex = $computed(() => entries.findIndex(([k, v]) => v === model.value));

const selectedLabel = $computed(() => entries[selectedIndex]?.[0]);

let showOptions = $shallowRef<boolean>(false);

const scrollOptionIntoView = (behavior: ScrollBehavior) => {
  if (!showOptions) return;

  if (selectedIndex === -1) return;

  nextTick(() => {
    // @note https://www.w3.org/WAI/content-assets/wai-aria-practices/patterns/listbox/examples/js/listbox.js
    optionsDom!.children[selectedIndex].scrollIntoView({
      behavior,
      block: "nearest",
      inline: "nearest",
    });
  });
};

// watch([$$(selectedIndex), $$(showOptions)], scrollOptionIntoView);
watch($$(selectedIndex), () => scrollOptionIntoView("smooth"));
watch($$(showOptions), () => scrollOptionIntoView("instant"));

const optionsDom = $shallowRef<HTMLDivElement>();

const selectPrev = () => {
  model.value = entries[(selectedIndex - 1 + entries.length) % entries.length][1];
};

const selectNext = () => {
  model.value = entries[(selectedIndex + 1) % entries.length][1];
};
</script>

<style module lang="scss">
.select {
  // @note reset <ul> style
  margin: 0;
  padding: 0;
  list-style: none;

  position: relative;

  border-radius: 1rem;

  //   &:focus {
  //     // @note used for focus ring radius
  // border-radius: 1rem 1rem 0 0;
  //   }
}

.current {
  // &::first-letter {
  //   text-transform: capitalize;
  // }

  display: flex !important;
  align-items: center;
  justify-content: space-between;

  cursor: pointer;

  border-radius: 1rem;
  // transition: border-radius 200ms;

  // &.options-shown {
  //   border-radius: 1rem 1rem 0 0;
  // }
}

.options {
  display: grid;

  position: absolute;
  z-index: 1;

  //   margin-top: 0.75rem;

  translate: 0 0.25lh;

  padding: 0.5rem;
  gap: 0.5rem;
  border-radius: 0.5rem;

  // @note this transition is merged in transition classes
  //   transition: border-radius 200ms;
  transition: translate 200ms;

  width: 100%;
  box-sizing: border-box;

  // text-transform: capitalize;

  max-height: 10lh;

  overflow-y: auto;

  background: rgba(var(--bg-rgb), 0.5);
  backdrop-filter: blur(7px);

  background-color: var(--bg);

  border: 2px solid var(--border);
  background-clip: padding-box;

  background-repeat: no-repeat;
  background-size: 100% 200%;
  background-image: linear-gradient(to bottom, rgba(var(--accent-rgb), 0.2), transparent);
  background-position-y: 100%;

  transition: background-position-y 300ms ease-out;

  &:hover {
    background-position-y: 0%;
  }
}

.option {
  padding: 0.5lh 1rem;

  border-radius: 0.5rem;

  cursor: pointer;

  // @note adjust scroll position so the element has even spacing vertically as horizontally (according to padding)
  scroll-margin: calc(1rem + 3px);

  transition: background 100ms ease-out;

  &:hover {
    // background: var(--tint-monochrome-25);
    background: color-mix(in srgb, currentColor 10%, transparent);
    box-shadow: inset 0 0 0.5rem -0.25rem color-mix(in srgb, currentColor 50%, transparent);
  }

  &.focused {
    outline: 3px solid var(--border);
  }
}

.placeholder {
  font-style: italic;

  // @blog proper transparency
  color: color(from currentColor srgb r g b / 66.6%);
  // color-mix(in srgb, currentColor 60%, transparent)
}
</style>

<style lang="scss">
.dropdown-toggle-enter-from,
.dropdown-toggle-leave-to {
  opacity: 0;
  translate: 0 -0.25lh;
}

.dropdown-toggle-enter-active,
.dropdown-toggle-leave-active {
  transition: 300ms;
  // transition: 400ms;
  transition-property: opacity, translate;
}
</style>
