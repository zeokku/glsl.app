const isNodeElement = (n: Node): n is HTMLElement => n.nodeType === Node.ELEMENT_NODE;

let cache = new Map<
  HTMLElement,
  {
    bbox: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
      sx?: number;
      sy?: number;
    };
    gr: number;
  }
>();

/**
 * Store bounding rectangle and computed glow radius
 * @param el
 * @returns
 */
const updateCache = (el: HTMLElement) => {
  const { left, top, right, bottom, width, height } = el.getBoundingClientRect();
  // @note value is in rem units
  const gr = parseFloat(getComputedStyle(el).getPropertyValue("--gr")) * 16;

  const cacheItem = { bbox: { left, top, right, bottom, width, height }, gr };

  cache.set(el, cacheItem);

  return cacheItem;
};

if (import.meta.env.DEV) {
  Object.assign(window, { glowCache: cache });
}

export const initGlowElements = (classNames: string[]) => {
  const selector = classNames.map(cn => "." + cn).join(",");

  const resizeObserver = new ResizeObserver(entries => {
    console.log(entries);

    entries.forEach(({ target }) => {
      updateCache(target as HTMLElement);
    });
  });

  const mutationObserver = new MutationObserver(entries => {
    entries.forEach(e => {
      e.addedNodes.forEach(n => {
        // @note not element
        if (!isNodeElement(n)) return;

        if (n.matches(selector)) {
          resizeObserver.observe(n, { box: "border-box" });
        } else {
          // @note bruh it only matched children, but glow-wrap elements can be added directly as well
          n.querySelectorAll(selector).forEach(e => {
            resizeObserver.observe(e, { box: "border-box" });
          });
        }
      });
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  const pointer = { x: 0, y: 0 };

  window.addEventListener("pointermove", ({ x, y }) => {
    Object.assign(pointer, { x, y });

    for (const [el, { bbox, gr }] of cache) {
      // @note skip hidden elements (like modals)
      if (!bbox.width || !bbox.height) continue;

      let ox = x + (bbox.sx ?? 0);
      let oy = y + (bbox.sy ?? 0);

      if (
        bbox.top - oy > gr || //
        ox - bbox.right > gr ||
        oy - bbox.bottom > gr ||
        bbox.left - ox > gr
      ) {
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
        continue;
      }

      el.style.setProperty("--mx", Math.round(x - bbox.left) + "px");
      el.style.setProperty("--my", Math.round(y - bbox.top) + "px");
    }
  });

  // @note scroll doesn't bubble but when using capturing, we can actually check if any child elements were scrolled
  window.addEventListener(
    "scroll",
    ({ target }) => {
      const glowList = (target as HTMLElement).querySelectorAll<HTMLElement>(selector);

      if (glowList) {
        const scrollX = (target as HTMLElement).scrollLeft;
        const scrollY = (target as HTMLElement).scrollTop;

        const style = (target as HTMLElement).style;
        style.setProperty("--scroll-x", scrollX + "px");
        style.setProperty("--scroll-y", scrollY + "px");

        glowList.forEach(e =>
          Object.assign(cache.get(e).bbox, {
            sx: scrollX,
            sy: scrollY,
          })
        );
      }
      // (target as HTMLElement).querySelectorAll<HTMLElement>(selector).forEach(el => {
      //   // @note this is still very slow (e.g. in shader library modal)
      //   // const { bbox } = updateCache(el);
      // });
    },
    { capture: true, passive: true }
  );

  // @note handle when we need to update bbox after transition ended
  document.addEventListener("transitionend", ({ propertyName, target }) => {
    // @note bruh vue <transition> stops propagation
    if (!["transform", "translate", "scale", "opacity"].includes(propertyName)) return;

    (target as HTMLElement).querySelectorAll<HTMLElement>(selector).forEach(updateCache);
  });
};
