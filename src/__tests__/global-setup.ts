import { JSDOM } from "jsdom";

export default function setup() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost:3000",
  });

  // Set up globals
  global.window = dom.window as any;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLInputElement = dom.window.HTMLInputElement;
  global.HTMLButtonElement = dom.window.HTMLButtonElement;

  // Also set on globalThis
  globalThis.window = dom.window as any;
  globalThis.document = dom.window.document;
  globalThis.navigator = dom.window.navigator;

  // Copy all window properties to global
  Object.keys(dom.window).forEach((key) => {
    if (!(key in global)) {
      (global as any)[key] = (dom.window as any)[key];
    }
    if (!(key in globalThis)) {
      (globalThis as any)[key] = (dom.window as any)[key];
    }
  });
}
