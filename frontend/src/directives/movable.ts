import { Directive } from "vue";

export const vMovable: Directive = {
  mounted(el: HTMLElement) {
    let mouseDown = false;

    const position = (x: number, y: number) => (el.style.translate = `${x}px ${y}px`);

    // we can't use bottom/right css because it breaks resizing @todo
    let x = window.innerWidth - el.offsetWidth - 50;
    let y = (window.innerHeight - el.offsetHeight) / 2;

    position(x, y);

    let prevX = x;
    let prevY = y;

    const onMouseMove = (e: MouseEvent) => {
      if (mouseDown) {
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

        position(x, y);
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
};
