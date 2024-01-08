<template lang="pug">
.btn.click-fx.App__glow-element-wrap
    button.App__glow-element
        slot(name="icon")
        span.App__font-shade
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

.btn {
  --br: 0.5rem;

  color: white;

  button {
    display: flex;

    // flex-wrap: wrap;
    justify-content: center;

    // @note smaller vertical gap, when text wraps
    gap: 0.3em 0.5em;

    cursor: inherit;

    padding: 0.5rem 0.75rem;
  }

  span {
    // @note lol?
    // display: block;

    text-transform: uppercase;
    font-weight: bold;
  }

  svg {
    display: inline-block;

    height: 1em;
    // @note use auto so it has proper size according to text size
    width: auto;
    // width: 1em;

    fill: currentColor;
    vertical-align: top;
    // button padding
    // moved to gap
    // margin-right: 0.75em;
  }
}
</style>
