import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

type DOMPurifyInstance = ReturnType<typeof createDOMPurify>;

let purify: DOMPurifyInstance | null = null;

export function getServerDOMPurify(): DOMPurifyInstance {
  if (!purify) {
    const window = new JSDOM("<!DOCTYPE html>").window;
    purify = createDOMPurify(window as unknown as Window & typeof globalThis);
  }
  return purify;
}
