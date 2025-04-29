import { h, render, VNode } from "vue";

import Toast from "+/Toast.vue";

// inspired by https://github.dev/ankurk91/vue-toast-notification/blob/main/src/js/Component.vue#L7

let list = [] as VNode<HTMLDivElement>[];
let key = 0;

export const useToast = (message: string) => {
  // @note update translateY and scale on previous toasts
  list.forEach(({ el }, i, { length }) => {
    const yPos = 5 + Math.min(4, length - i);

    const scale = Math.max(
      0.5,
      1 -
        0.03 *
          Math.max(
            0,
            length -
              // @note add +1 is to make previous toast to also have scale=1
              (i + 1)
          ) **
            2
    );

    console.log(i, scale);

    el!.style.transform = `translateY(-${yPos}rem) scale(${scale})`;
  });

  // @note i forgot that when rendering lists, vnodes should have keys, this is why it wasn't working before
  let toastVnode = h(Toast, {
    message,
    key,
    onAnimationend() {
      list.splice(list.indexOf(toastVnode), 1);
      if (list.length) {
        render(h("div", [...list]), document.body);
      } else {
        render(null, document.body);
      }
    },
  }) as VNode<HTMLDivElement>;

  key += 1;

  // list.unshift(toastVnode);
  list.push(toastVnode);

  // @note copy list so wrap vnode is updated
  render(h("div", [...list]), document.body);
};
