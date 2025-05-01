<template lang="pug">
article.changelog.CModal__content
  header
    h1 Changelog

  main(v-html="md(changelog)")

  footer
    | Made with 💖 by
    |
    a(@click="onLinkClick", href="https://zeokku.com") ZEOKKU
</template>

<script setup lang="ts">
import changelog from "@/markdown/changelog.md?raw";
import { md } from "../../markdown";

const onLinkClick = () => {
  gtagEvent("zeokku_click");
};
</script>

<style lang="less" module>
.changelog {
  font-size: 1.25rem;

  overflow: hidden auto;

  section {
    margin-block: 2rem;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 0.75em;

    margin-block: 5rem 1.5rem;

    &:first-of-type {
      margin-top: 2rem;
    }

    code {
      color: hsl(323 60% 70% / 1);
      font-size: 0.75em;

      background: rgb(27 27 27 / 50%);
      padding-inline: 0.5em;
      border: solid #4e4e4e 1px;
      border-radius: 0.5em;
    }
  }

  h3 {
    margin-block: 1rem;
  }

  main {
    max-width: 50rem;
  }

  footer {
    margin-block: 4rem -2rem;
    font-size: 0.9rem;
    text-align: center;
  }

  // li {
  //   text-wrap-style: balance;
  // }

  kbd {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;

    padding: 0.2rem 0.3rem;

    color: white;
    // @note content in top kbd will be muted typically + symbols
    &:has(> kbd) {
      color: hsl(0 7% 60% / 1);
    }

    > kbd {
      padding-block: 0;
    }

    font-size: 0.9rem;

    background: hsl(0, 7%, 18.34%);
    border-radius: 0.5rem;

    border: 1px solid var(--border);
    border-bottom-width: 2px;
  }
}
</style>
