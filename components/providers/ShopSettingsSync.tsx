"use client";

import { useEffect } from "react";
import { useShopSettings } from "@/api/shopSettings";
import { syncQzSettings } from "@/lib/qz/env";

/**
 * Syncs DB shop settings into the QZ module-level cache.
 * Mount once in the dashboard layout.
 */
export function ShopSettingsSync() {
  const { data } = useShopSettings();

  useEffect(() => {
    if (!data) return;
    syncQzSettings({
      qz_enabled: data.qz_enabled,
      qz_printer_invoice: data.qz_printer_invoice,
      qz_printer_label: data.qz_printer_label,
    });
  }, [data]);

  return null;
}
