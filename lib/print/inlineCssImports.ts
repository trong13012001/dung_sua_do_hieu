/**
 * Gộp `@import` trong CSS (Next/Tailwind thường tách file) — job HTML in nhiệt cần một chuỗi,
 * không tải follow-up import như trình duyệt.
 */
/** Tailwind v4 / Next: `@import "…" layer(…);` hoặc `url(…)` */
const IMPORT_RE =
  /@import(?:\s+url)?\s*\(\s*["']?([^"');\s]+)["']?\s*\)(?:\s+layer\s*\([^)]*\))?\s*;|@import\s+["']([^"';]+)["']\s*(?:layer\s*\([^)]*\))?\s*;/i;

async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  }
}

export async function flattenCssImports(
  css: string,
  baseHref: string,
  visited: Set<string>,
  depth: number,
): Promise<string> {
  if (depth > 40) return css;
  let result = css;
  for (let i = 0; i < 60; i++) {
    IMPORT_RE.lastIndex = 0;
    const m = IMPORT_RE.exec(result);
    if (!m) break;
    const full = m[0];
    const spec = (m[1] || m[2] || "").trim();
    if (!spec || spec.startsWith("data:")) {
      result = result.replace(full, "");
      continue;
    }
    let abs: string;
    try {
      abs = new URL(spec, baseHref).href;
    } catch {
      result = result.replace(full, "");
      continue;
    }
    if (visited.has(abs)) {
      result = result.replace(full, "");
      continue;
    }
    visited.add(abs);
    const sheet = await fetchText(abs);
    const inner = sheet
      ? await flattenCssImports(sheet, abs, visited, depth + 1)
      : "";
    result = result.replace(full, `\n${inner}\n`);
  }
  return result;
}

export { fetchText };
