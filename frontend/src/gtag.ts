const id = "G-94PLD7R8DJ";

let script = document.createElement("script");
// script.async = true;
script.defer = true;
script.src = "https://www.googletagmanager.com/gtag/js?id=" + id;

document.head.append(script);

type TEvents = {
  export_click: never;

  share_click: { type: "online" } | undefined;

  donate_click: never;
  crypto_click: { name: "ETH" | "BTC" | "LTC" | "XTZ" };

  discord_click: never;

  github_click: never;

  changelog_click: never;
};

declare global {
  var dataLayer: any[];

  //   https://developers.google.com/tag-platform/gtagjs/reference
  function gtag(...args: any[]): void;

  /**
   * log analytics event
   */
  var gtagEvent: {
    // @todo problem to make 2nd argument optional in one case and required in the other

    // https://stackoverflow.com/questions/67744976/how-to-make-second-function-argument-optional-depending-on-first
    // @note deriving type in <> works but can't be used for rest parameter?
    // O = TEvents[N] extends never ? [] : [TEvents[N]]
    // @blog
    // never extends undefined
    <N extends keyof TEvents, E = TEvents[N]>(
      name: N,
      ...opt: E extends undefined ? [] : E extends [] ? E : [E]
    ): void;

    // <N extends keyof TEvents, O = TEvents[N] extends undefined ? never : TEvents[N]>(
    //   name: N,
    //   opt: O
    // ): void;

    // <N extends keyof TEvents, R = TEvents[N] extends undefined ? void : never>(name: N): R;
  };
}

window.dataLayer = [];
window.gtag = function () {
  dataLayer.push(arguments);
};
// @ts-ignore
window.gtagEvent = (name, opt) => gtag("event", name, opt);

gtag("js", new Date());
gtag("config", id, { transport_type: "beacon" });
gtag("consent", "ad_storage", "denied");

export {};
