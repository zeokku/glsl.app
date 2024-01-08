import "./style.less";

import "@/gtag";

import { createApp } from "vue";

import { createI18n } from "petite-vue-i18n";
import messages from "@intlify/unplugin-vue-i18n/messages";

import urql, { cacheExchange, fetchExchange } from "@urql/vue";

import App from "./App.vue";
import { vMovable } from "./directives/movable";

declare global {
  var app: HTMLDivElement;
}

/**
 * MMmmPP
 *
 * 010200 = 1.2.0
 */
export const currentVersion = "010400";

createApp(App) //
  .use(
    createI18n({
      // @note remove regional modificator
      locale: (new URL(location.toString()).searchParams.get("lang") ?? navigator.language) //
        .split("-")[0],
      fallbackLocale: "en",
      messages,
      // missingWarn: false,
      // fallbackWarn: false,
    })
  )
  .use(urql, {
    url: import.meta.env.APP_GQL_ENDPOINT,
    exchanges: [cacheExchange, fetchExchange],
  })
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
