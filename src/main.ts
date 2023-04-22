import "./style.less";

import "@/gtag";

import { createApp } from "vue";

import { createI18n } from "petite-vue-i18n";
import messages from "@intlify/unplugin-vue-i18n/messages";

import App from "./App.vue";
import { vMovable } from "./directives/movable";

declare global {
  var app: HTMLDivElement;
}

createApp(App) //
  .use(
    createI18n({
      fallbackLocale: "en",
      messages,
    })
  )
  .directive("movable", vMovable)
  .mount(app);

declare global {
  interface HTMLCollectionBase {
    [Symbol.iterator](): IterableIterator<HTMLElement>;
  }

  interface MouseEvent {
    currentTarget: HTMLElement;
  }
}
