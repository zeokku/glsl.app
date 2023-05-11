import { shallowReactive } from "vue";

let mouse = shallowReactive({
  x: 0,
  y: 0,
});

export const useMouse = () => mouse;

window.addEventListener("pointermove", ({ x, y }) => {
  mouse.x = x;
  mouse.y = y;
});
