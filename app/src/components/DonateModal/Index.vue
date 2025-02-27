<template lang="pug">
.donate.CModal__content
    section
        h1 Crypto 
        //- @note oh wow so in for objects works like of for maps in vue templates
        .crypto(v-for="(address, name) in ADDRESSES")
            .name 
                | {{ name }}
                | :
            span.address(:data-name="name" @click="() => onAddressClick(address, name)") {{ address }}
    section
        h1 Ko-fi 
        iframe.ko-fi(id='kofiframe' src='https://ko-fi.com/zeokku/?hidefeed=true&widget=true&embed=true&preview=true' height='712' title='zeokku')
</template>

<script setup lang="ts">
// btc, eth, ltc, tez
// show address, click to copy + show qr on hover

import { useToast } from "@/composition/useToast";
import { useI18n } from "petite-vue-i18n";

const ADDRESSES = Object.freeze({
  ETH: "0x0092c592f82fe5b5ea6bdd499453f93df694d677",
  BTC: "163mnUY3NAXPKTs3R8CnmyAtE74fbtEGDd",
  LTC: "LczKAjaDtnLZXtFKxRcAhWoUpmwXpx6yZR",
  XTZ: "tz1WJ7oUhdYug8F68R8bps9eQfKKhg1gkDVf",
} as const);

const { t } = useI18n();

const onAddressClick = (address: string, name: keyof typeof ADDRESSES) => {
  navigator.clipboard.writeText(address).then(() => {
    gtagEvent("crypto_click", { name });

    useToast(t("address-copied"));
  });
};
</script>

<style lang="less" module>
.donate {
  font-size: 1.25rem;

  overflow: hidden auto;

  section {
    margin-block: 2rem;
  }
}

.crypto {
  margin-block: 1rem;
}

.name {
  font-weight: bold;
}

.address {
  position: relative;

  cursor: pointer;

  transition: background 300ms;

  &:hover {
    background-color: rgba(255, 255, 255, 0.25);

    &::after {
      // @note @todo rip https://caniuse.com/mdn-css_types_attr_type-or-unit
      // content: attr(data-qr url);

      content: "";

      position: absolute;
      z-index: 1;
      left: 0;
      top: 100%;

      @sz: 15em;
      width: @sz;
      height: @sz;
      background-color: white;
      background-size: contain;

      border: solid black 1px;
      border-radius: 1rem;

      [data-name="ETH"]& {
        background-image: url("@/assets/crypto/eth.jpg");
      }

      [data-name="BTC"]& {
        background-image: url("@/assets/crypto/btc.png");
      }

      [data-name="LTC"]& {
        background-image: url("@/assets/crypto/ltc.png");
      }

      [data-name="XTZ"]& {
        background-image: url("@/assets/crypto/xtz.png");
      }
    }
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.5);
  }
}

.ko-fi {
  border-radius: 2rem;
  border: none;
  width: 30rem;
  padding: 0.5rem;

  background: white;
  //background:#f9f9f9;
}
</style>
