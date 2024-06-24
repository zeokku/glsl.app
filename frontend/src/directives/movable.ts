import { Directive } from "vue";

const movableSymbol = Symbol("vMovable");

interface IMovableElement extends HTMLElement {
  [movableSymbol]: boolean;
}

const position = (el: HTMLElement, x: number, y: number) => (el.style.translate = `${x}px ${y}px`);

export const vMovable: Directive = {
  mounted(el: IMovableElement, { arg }) {
    let mouseDown = false;

    // @todo arg is boolean, vue types are incorrect
    el[movableSymbol] = arg as unknown as boolean;

    // we can't use bottom/right css because it breaks resizing @todo
    let x = window.innerWidth - el.offsetWidth - 50;
    let y = (window.innerHeight - el.offsetHeight) / 2;

    if (arg) position(el, x, y);

    let prevX = x;
    let prevY = y;

    const onMouseMove = (e: MouseEvent) => {
      if (mouseDown && el[movableSymbol]) {
        // @note well movement behaves incorrectly when the page is scaled
        // x += e.movementX;
        // y += e.movementY;

        // so use ol' client coords
        let dx = e.clientX - prevX;
        let dy = e.clientY - prevY;

        x += dx;
        y += dy;

        prevX = e.clientX;
        prevY = e.clientY;

        position(el, x, y);
      }
    };

    el.addEventListener("pointerdown", e => {
      // don't move on resizer
      if (e.offsetX < el.offsetWidth - 10 && e.offsetY < el.offsetHeight - 10) {
        mouseDown = true;

        prevX = e.clientX;
        prevY = e.clientY;
      }
    });
    window.addEventListener("pointerup", () => (mouseDown = false));
    window.addEventListener("pointermove", onMouseMove);
  },

  updated(el: IMovableElement, { arg }) {
    el[movableSymbol] = arg as unknown as boolean;

    // @note not movable
    if (!arg) {
      position(el, 0, 0);
    }
  },
};
