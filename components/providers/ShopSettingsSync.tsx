"use client";

import { useEffect } from "react";
import { useShopSettings } from "@/api/shopSettings";
import { syncThermalPrintersFromShop } from "@/lib/print/shopPrinterCache";

/**
 * Đồng bộ tên máy in từ DB vào cache (`lib/print/shopPrinterCache`) cho Electron / agent / dialog.
 * Mount một lần trong layout dashboard.
 */
export function ShopSettingsSync() {
  const { data } = useShopSettings();

  useEffect(() => {
    if (!data) return;
    syncThermalPrintersFromShop({
      thermal_printer_invoice: data.thermal_printer_invoice,
      thermal_printer_label: data.thermal_printer_label,
    });
  }, [data]);

  return null;
}
