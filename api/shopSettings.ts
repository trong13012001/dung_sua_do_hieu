import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ShopSettings {
  shop_name: string;
  shop_hotline: string;
  shop_address: string;
  bank_name: string;
  bank_account: string;
  bank_account_holder: string;
  thermal_printer_invoice: string;
  thermal_printer_label: string;
}

const SETTINGS_DEFAULTS: ShopSettings = {
  shop_name: "DŨNG SỬA ĐỒ HIỆU",
  shop_hotline: "0904672288",
  shop_address: "",
  bank_name: "Techcombank",
  bank_account: "1902 9116 9690 16",
  bank_account_holder: "Nguyễn Thu Hằng",
  thermal_printer_invoice: "",
  thermal_printer_label: "",
};

const QUERY_KEY = ["shop_settings"] as const;

export async function getShopSettings(): Promise<ShopSettings> {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("key, value");

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.key, row.value);
  }

  const result = { ...SETTINGS_DEFAULTS };
  for (const key of Object.keys(SETTINGS_DEFAULTS) as (keyof ShopSettings)[]) {
    const v = map.get(key);
    if (v !== undefined) result[key] = v;
  }

  /* Trước khi chạy migration SQL: đọc giá trị máy in từ khóa shop_settings cũ. */
  if (!result.thermal_printer_invoice.trim()) {
    const legacy = map.get("qz_printer_invoice");
    if (legacy !== undefined) result.thermal_printer_invoice = legacy;
  }
  if (!result.thermal_printer_label.trim()) {
    const legacy = map.get("qz_printer_label");
    if (legacy !== undefined) result.thermal_printer_label = legacy;
  }

  return result;
}

export async function updateShopSettings(
  settings: Partial<ShopSettings>,
): Promise<void> {
  const rows = Object.entries(settings)
    .filter(([, v]) => v !== undefined)
    .map(([key, value]) => ({
      key,
      value: value as string,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("shop_settings").upsert(rows, {
    onConflict: "key",
  });

  if (error) throw error;
}

export function useShopSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getShopSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpdateShopSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateShopSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
