<template lang="pug">
.button.click-fx.App__glow-element-wrap
  button.App__glow-element
    .content.App__font-shade
      slot
</template>

<style module lang="less">
.click-fx {
  cursor: pointer;

  transition: transform 100ms ease-out;

  &:active {
    transform: translateY(2px);
  }
}

.button {
  --br: 0.5rem;

  color: white;

  button {
    // @todo why doesn't it take 100% of parent on its own???
    width: 100%;

    text-transform: uppercase;
    font-weight: bold;
    white-space: nowrap;

    // flex-wrap: wrap;
    // justify-content: center;
    cursor: inherit;

    padding: 0.5rem 0.75rem;
  }

  svg {
    display: inline-block;

    // @note three rules to align with text
    vertical-align: top;
    height: 1lh;
    width: 1em;

    fill: currentColor;
    // button padding
    // moved to gap
    // margin-right: 0.75em;
  }
}

.content {
  display: flex;

  align-items: center;

  // @note smaller vertical gap, when text wraps
  gap: 0.3em 0.5em;
}
</style>
