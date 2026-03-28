/** HTML cho QZ pixel/html — gắn stylesheet hiện tại + base URL. */
export function buildPrintableHtmlFromElement(el: HTMLElement): string {
  const origin = globalThis.location.origin;
  const links = [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((node) => (node as HTMLLinkElement).href)
    .filter(Boolean)
    .map(
      (href) =>
        `<link rel="stylesheet" href="${href.replace(/"/g, "&quot;")}" />`,
    )
    .join("\n");

  const wrapper = el.cloneNode(true) as HTMLElement;
  wrapper.querySelectorAll(".non-print").forEach((n) => n.remove());

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><base href="${origin}/"/>
${links}
<style>
  @page { margin: 0; size: auto; }
  html, body { margin: 0; padding: 0; background: #fff; }
</style></head><body>${wrapper.outerHTML}</body></html>`;
}
