/// <reference types="vite-plugin-pwa/client" />

import "./style.less";

import "@/gtag";

import { createApp } from "vue";

import { createI18n } from "petite-vue-i18n";
import messages from "@intlify/unplugin-vue-i18n/messages";

import { registerSW } from "virtual:pwa-register";

import urql, { cacheExchange, fetchExchange } from "@urql/vue";

import App from "./App.vue";
import { vMovable } from "./directives/movable";
import { getSetting } from "./settings";

declare global {
  var app: HTMLDivElement;
}

/**
 * MMmmPP
 *
 * 010501 = 1.5.1
 */
export const currentVersion = "010501";

createApp(App) //
  .use(
    createI18n({
      // @note override saved settings with query value. also remove regional modificator because it won't properly fallback to base lang
      locale:
        new URLSearchParams(location.search).get("lang")?.split("-")?.[0] ?? getSetting("lang"),
      fallbackLocale: "en",
      messages,
      missingWarn: import.meta.env.DEV,
      fallbackWarn: import.meta.env.DEV,
    })
  )
  .use(urql, {
    url: import.meta.env.APP_GQL_ENDPOINT,
    exchanges: [cacheExchange, fetchExchange],
  })
  .directive("movable", vMovable)
  .mount(app);

const updateSW = registerSW({
  onNeedRefresh() {
    // @todo modal component confirm
    if (confirm("New version is available! Do you want to update now?")) {
      updateSW();
    }
  },
  onOfflineReady() {
    console.log("app stored in cache and can be used offline");
  },
});

declare global {
  interface HTMLCollectionBase {
    [Symbol.iterator](): IterableIterator<HTMLElement>;
  }

  interface MouseEvent {
    currentTarget: HTMLElement;
  }
}
