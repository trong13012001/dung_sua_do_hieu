export interface ElectronThermalPrintApi {
  readonly printHtmlSilent: (
    html: string,
    deviceName?: string,
  ) => Promise<void>;
}

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
 * Lỗi IPC / driver / OS không hợp lệ → trả về `false` để luồng in thử agent hoặc dialog.
 */
export async function tryElectronSilentPrint(
  html: string,
  deviceName?: string,
): Promise<boolean> {
  const a = api();
  if (!a?.printHtmlSilent) return false;
  try {
    await a.printHtmlSilent(html, deviceName?.trim() || undefined);
    return true;
  } catch (err) {
    console.warn("[electronThermalPrint] silent print failed:", err);
    return false;
  }
}
