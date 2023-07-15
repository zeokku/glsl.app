<template lang="pug">
article.changelog.CModal__content
    header
        h1 Changelog

    main(v-html="md(changelog)")

    footer
        | Made with 💖 by
        |
        a(href="https://zeokku.com" target="_blank") ZEOKKU
</template>

<script setup lang="ts">
import changelog from "@/markdown/changelog.md?raw";
import { md } from "../../markdown";
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

    code {
      color: #9a9a00;
      font-size: 0.75em;

      background: rgb(27 27 27 / 50%);
      padding-inline: 0.5em;
      border: solid #4e4e4e 1px;
      border-radius: 0.5em;
    }
  }

  main {
    max-width: 50rem;
  }

  footer {
    margin-block: 4rem -2rem;
    font-size: 0.9rem;
    text-align: center;
  }
}
</style>
