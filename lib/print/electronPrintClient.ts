/** Một máy in Windows từ `getPrintersAsync` — `name` dùng cho in im lặng / DB. */
export interface WindowsPrinterOption {
  readonly name: string;
  readonly displayName: string;
  readonly isDefault?: boolean;
}

export interface ElectronThermalPrintApi {
  readonly printHtmlSilent: (
    html: string,
    deviceName?: string,
  ) => Promise<void>;
  readonly listThermalPrinters?: () => Promise<unknown>;
}

export type ElectronSilentPrintResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "unavailable" }
  | { readonly ok: false; readonly reason: "failed"; readonly message: string };

function api(): ElectronThermalPrintApi | undefined {
  if (typeof globalThis === "undefined") return undefined;
  return (globalThis as unknown as { electronThermalPrint?: ElectronThermalPrintApi })
    .electronThermalPrint;
}

export function isElectronThermalPrintAvailable(): boolean {
  return Boolean(api()?.printHtmlSilent);
}

export function isElectronPrinterListAvailable(): boolean {
  return Boolean(api()?.listThermalPrinters);
}

/** Chỉ khi mở POS trong Electron trên Windows; trình duyệt thường trả []. */
export async function listThermalPrintersFromElectron(): Promise<
  WindowsPrinterOption[]
> {
  const fn = api()?.listThermalPrinters;
  if (!fn) return [];
  try {
    const raw = await fn();
    if (!Array.isArray(raw)) return [];
    const out: WindowsPrinterOption[] = [];
    for (const p of raw as unknown[]) {
      if (!p || typeof p !== "object") continue;
      const o = p as unknown as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) continue;
      const dn =
        typeof o.displayName === "string" ? o.displayName.trim() : "";
      const displayName = dn || name;
      out.push({
        name,
        displayName,
        isDefault: Boolean(o.isDefault),
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * In im lặng qua shell Electron (`webContents.print({ silent: true })`).
 * `unavailable`: không có preload (thường là đang mở POS trong trình duyệt).
 * `failed`: IPC/driver lỗi — không nên im lặng rơi xuống hộp thoại in trình duyệt.
 */
export async function tryElectronSilentPrint(
  html: string,
  deviceName?: string,
): Promise<ElectronSilentPrintResult> {
  const a = api();
  if (!a?.printHtmlSilent) {
    return { ok: false, reason: "unavailable" };
  }
  try {
    await a.printHtmlSilent(html, deviceName?.trim() || undefined);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[electronThermalPrint] silent print failed:", err);
    return { ok: false, reason: "failed", message };
  }
}
