<template lang="pug">
article.App__article.donate.CModal__content
  //- h1.App__font-shade.App__icon-title
    heart-icon
    | Donate

  h1.donation-tip
    heart-icon
    | {{ " " }}
    | {{ t("donate-title") }}

  section.App__region
    h2.App__font-shade.App__icon-title
      //- list-item-icon
      | Crypto
    //- @note oh wow so in for objects works like of for maps in vue templates
    div(v-for="(address, chain) in ADDRESSES")
      div
        b {{ chain }}:
      .address(@click="() => onAddressClick(address, chain)") 
        //- | {{  address.replace(new RegExp(`/^(?<=.{${Math.floor(address.length / 2)  }})\b`), '\u00ad') }}
        //- @note insert &shy; so it wraps better
        | {{ address.slice(0, address.length / 2) + "\u00ad" + address.slice(address.length / 2) }}
        canvas.address-qr(:data-chain="chain")

  section.App__region
    h2.App__font-shade.App__icon-title
      //- list-item-icon
      | Ko-fi
    iframe#kofiframe.ko-fi(
      src="https://ko-fi.com/zeokku/?hidefeed=true&widget=true&embed=true&preview=true",
      height="712",
      title="zeokku"
    )
</template>

<script setup lang="ts">
// btc, eth, ltc, tez
// show address, click to copy + show qr on hover

import { useToast } from "@/composition/useToast";
import { useI18n } from "petite-vue-i18n";

import HeartIcon from "octicons:heart";
import ListItemIcon from "octicons:dot";
import { onMounted } from "vue";

const ADDRESSES = Object.freeze({
  ETH: "0x0092c592f82fe5b5ea6bdd499453f93df694d677",
  BTC: "163mnUY3NAXPKTs3R8CnmyAtE74fbtEGDd",
  LTC: "LczKAjaDtnLZXtFKxRcAhWoUpmwXpx6yZR",
  XTZ: "tz1WJ7oUhdYug8F68R8bps9eQfKKhg1gkDVf",
} as const);

onMounted(async () => {
  const {
    default: { render },
  } = await import("qr-creator");

  const canvases = [
    ...document.querySelectorAll<HTMLCanvasElement>(`canvas.${$cssModule["address-qr"]}`),
  ];

  Object.entries(ADDRESSES).forEach(([chain, address]) => {
    const canvas = canvases.find(c => c.dataset.chain === chain)!;
    render(
      {
        text: address,
        ecLevel: "M",
        fill: "#0a0118", // "var(--bg)",
        background: "#ffffff",
        radius: 0.5,
        size: 16 * 16,
      },
      canvas
    );
  });
});

const { t } = useI18n();

const onAddressClick = (address: string, chain: keyof typeof ADDRESSES) => {
  navigator.clipboard.writeText(address).then(() => {
    gtagEvent("crypto_click", { chain });

    useToast(t("address-copied"));
  });
};
</script>

<style lang="less" module>
.donate {
  max-width: 60ch;

  font-size: 1.25rem;

  overflow: hidden auto;
}

.donation-tip {
  color: rgba(255, 153, 171);

  background-color: hsl(from currentColor h s l / 15%);

  // box-shadow: inset 0px 0px 8px 4px hsl(from currentColor h s l / 25%);

  padding: 0.25lh 1ch;
  // @note align text with content
  margin-inline: -1ch;
  margin-top: 0.5rem;

  border-radius: 1rem;
  font-size: 1.2em;

  // font-weight: bold;
  // font-size: 1.5rem;
  // text-align: center;

  // align-items: flex-start !important;

  // @star @blog finally
  svg {
    height: 1lh;
    width: 1em;
    vertical-align: bottom;
  }
}

.address {
  display: inline-block;

  position: relative;

  cursor: pointer;

  font-family: monospace;

  hyphenate-character: "";

  @bound: 0.5ch;
  padding-inline: @bound;
  margin-inline: -@bound;

  border-radius: 0.5ch;

  transition: background 300ms;

  &:hover {
    background-color: rgba(255, 255, 255, 0.25);

    .address-qr {
      opacity: 1;
    }
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.5);
  }
}

.address-qr {
  width: 16rem;
  height: 16rem;

  opacity: 0;
  position: absolute;

  // @note lack of z-index caused weird transparent qr bug
  z-index: 1;

  padding: 0.5rem;
  border-radius: 0.5rem;

  background: white;

  pointer-events: none;

  transition: opacity 300ms ease-out;
}

.ko-fi {
  border-radius: 2rem;
  border: none;
  width: 100%;
  max-width: 50ch;
  justify-self: center;
  padding: 0.5rem;

  background: white;
  //background:#f9f9f9;
}
</style>
