import '@testing-library/jest-dom/vitest'

// Radix primitives use pointer-capture and scrolling APIs that jsdom does not
// implement. Keep these shims in the shared test environment so interaction
// tests exercise the same shadcn components used in the browser.
if (!('PointerEvent' in window)) {
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MouseEvent,
  })
}

if (!('hasPointerCapture' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  })
}

if (!('setPointerCapture' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  })
}

if (!('releasePointerCapture' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  })
}

if (!('scrollIntoView' in Element.prototype)) {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  })
}
