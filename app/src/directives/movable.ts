import { Directive } from "vue";

const movableSymbol = Symbol("vMovable");

interface IMovableElement extends HTMLElement {
  [movableSymbol]: {
    enabled: boolean;
    x: number;
    y: number;
  };
}

const updatePosition = (el: IMovableElement, x: number, y: number) =>
  (el.style.translate = `${x}px ${y}px`);

export const vMovable: Directive<IMovableElement> = {
  mounted(el, { arg }) {
    let mouseDown = false;

    let x = window.innerWidth - el.offsetWidth - 50;
    let y = (window.innerHeight - el.offsetHeight) / 2;

    el[movableSymbol] = {
      // @todo arg is boolean, vue types are incorrect
      enabled: arg as unknown as boolean,
      // @todo we can't use bottom/right css because it breaks resizing
      x,
      y,
    };

    let prevX = x;
    let prevY = y;

    if (arg) updatePosition(el, x, y);

    const onMouseMove = (e: MouseEvent) => {
      if (mouseDown && el[movableSymbol].enabled) {
        // @note well movement behaves incorrectly when the page is scaled
        // x += e.movementX;
        // y += e.movementY;

        // so use ol' client coords
        let dx = e.clientX - prevX;
        let dy = e.clientY - prevY;

        x += dx;
        y += dy;

        Object.assign(el[movableSymbol], { x, y });

        prevX = e.clientX;
        prevY = e.clientY;

        updatePosition(el, x, y);
      }
    };

    el.addEventListener("pointerdown", e => {
      // don't move on resizer
      if (e.offsetX < el.offsetWidth - 10 || e.offsetY < el.offsetHeight - 10) {
        mouseDown = true;

        prevX = e.clientX;
        prevY = e.clientY;
      }
    });
    window.addEventListener("pointerup", () => (mouseDown = false));
    window.addEventListener("pointermove", onMouseMove);
  },

  updated(el: IMovableElement, { arg }) {
    el[movableSymbol].enabled = arg as unknown as boolean;

    // @note not movable
    if (!arg) {
      updatePosition(el, 0, 0);
    } else {
      const { x, y } = el[movableSymbol];
      updatePosition(el, x, y);
    }
  },
};
