// @todo
export const getRadiusOffset = (
  el: HTMLElement // get radius offset
) => 5 * parseFloat(getComputedStyle(el)["fontSize"]);

// @note since offsetLeft/Top causes style recalculations it makes sense to cache them and update only when layout changes
// @note finally weakmap? so if dom elements are removed we won't hold bbox in memory as well
let bboxCache = new WeakMap<Element, DOMRect>();

// @note omfg i did { entries } instead of (entries) which didn't error, because entries.entries exists
// export const glowResizeObserver = new ResizeObserver(entries => {
//   for (const e of entries) {
//     console.log("resize", e.target);
//     bboxCache.set(e.target, e.target.getBoundingClientRect());
//   }
// });

// window.addEventListener(
//   "resize",
//   () =>
//     // @todo bruh wut, there's no .clear for weak map?
//     // offsetsCache.clear()
//     (bboxCache = new WeakMap())
// );

interface IPointer {
  x: number;
  y: number;
}

export const updateBbox = (el: HTMLElement) => {
  const bbox = el.getBoundingClientRect();
  bboxCache.set(el, bbox);

  return bbox;
};

export const updateElGlow = (el: HTMLElement, { x, y }: IPointer, force: boolean = false) => {
  // @note offset is relative to target, not currentTarget, so use clientXY instead
  let bbox;

  // @star nice optimization for force, so we don't look up value we won't use
  if (force || !(bbox = bboxCache.get(el))) {
    bbox = updateBbox(el);
  }

  el.style.setProperty("--mx", x - bbox.left + "px");
  el.style.setProperty("--my", y - bbox.top + "px");
};
