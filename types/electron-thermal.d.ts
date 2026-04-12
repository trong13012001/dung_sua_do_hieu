declare global {
  interface Window {
    electronThermalPrint?: {
      printHtmlSilent: (html: string, deviceName?: string) => Promise<void>;
    };
  }
}

export {};
