const isNodeElement = (n: Node): n is HTMLElement => n.nodeType === Node.ELEMENT_NODE;

let bboxCache = new Map<HTMLElement, DOMRect>();

const updateBboxCache = (e: HTMLElement) => {
  const bbox = e.getBoundingClientRect();
  bboxCache.set(e, bbox);

  return bbox;
};

if (import.meta.env.DEV) {
  Object.assign(window, { bboxCache });
}

export const initGlowElements = (classNames: string[]) => {
  const selector = classNames.map(cn => "." + cn).join(",");

  const resizeObserver = new ResizeObserver(entries => {
    console.log(entries);

    entries.forEach(({ target }) => {
      updateBboxCache(target as HTMLElement);
    });
  });

  const mutationObserver = new MutationObserver(entries => {
    entries.forEach(e => {
      e.addedNodes.forEach(n => {
        // @note not element
        if (!isNodeElement(n)) return;

        [...n.querySelectorAll(selector)].forEach(e => {
          resizeObserver.observe(e, { box: "border-box" });
        });
      });
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  const gr = 10 * 16; // 3, 5, 10

  const pointer = { x: 0, y: 0 };

  window.addEventListener("pointermove", ({ x, y }) => {
    Object.assign(pointer, { x, y });

    for (const [el, bbox] of bboxCache) {
      // @note skip hidden elements (like modals)
      if (!bbox.width || !bbox.height) continue;

      if (
        bbox.top - y > gr || //
        x - bbox.right > gr ||
        y - bbox.bottom > gr ||
        bbox.left - x > gr
      )
        continue;

      el.style.setProperty("--mx", Math.round(x - bbox.left) + "px");
      el.style.setProperty("--my", Math.round(y - bbox.top) + "px");
    }
  });

  // @note scroll doesn't bubble but when using capturing, we can actually check if any child elements were scrolled
  window.addEventListener(
    "scroll",
    ({ target }) => {
      [...(target as HTMLElement).querySelectorAll(selector)].forEach(el => {
        const bbox = updateBboxCache(el);

        el.style.setProperty("--mx", Math.round(pointer.x - bbox.left) + "px");
        el.style.setProperty("--my", Math.round(pointer.y - bbox.top) + "px");
      });
    },
    { capture: true, passive: true }
  );

  // @note handle when we need to update bbox after transition ended
  document.addEventListener("transitionend", ({ propertyName, target }) => {
    if (!["transform", "translate", "scale"].includes(propertyName)) return;

    [...(target as HTMLElement).querySelectorAll(selector)].forEach(e =>
      bboxCache.set(e, e.getBoundingClientRect())
    );
  });
};
