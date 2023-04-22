declare global {
  interface PointerEvent<TTargetType extends EventTarget = EventTarget> {
    target: TTargetType;
  }
}

export {};
