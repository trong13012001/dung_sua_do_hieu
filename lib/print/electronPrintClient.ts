export interface ElectronThermalPrintApi {
  readonly printHtmlSilent: (
    html: string,
    deviceName?: string,
  ) => Promise<void>;
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
