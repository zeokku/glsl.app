import { shallowReactive } from "vue";

let screen = shallowReactive({
  w: window.innerWidth,
  h: window.innerHeight,
});

window.addEventListener("resize", () => {
  screen.w = window.innerWidth;
  screen.h = window.innerHeight;
});

export const useScreen = () => screen;
