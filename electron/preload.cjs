const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronThermalPrint", {
  /**
   * @param {string} html
   * @param {string} [deviceName] Tên máy in Windows (đúng như trong Settings / Printers)
   */
  printHtmlSilent: (html, deviceName) =>
    ipcRenderer.invoke("thermal-print-html", { html, deviceName }),
});
