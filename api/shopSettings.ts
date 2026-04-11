import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ShopSettings {
  shop_name: string;
  shop_hotline: string;
  shop_address: string;
  bank_name: string;
  bank_account: string;
  bank_account_holder: string;
  qz_enabled: string;
  qz_printer_invoice: string;
  qz_printer_label: string;
  qz_certificate: string;
  qz_private_key: string;
}

const SETTINGS_DEFAULTS: ShopSettings = {
  shop_name: "DŨNG SỬA ĐỒ HIỆU",
  shop_hotline: "0904672288",
  shop_address: "",
  bank_name: "Techcombank",
  bank_account: "1902 9116 9690 16",
  bank_account_holder: "Nguyễn Thu Hằng",
  qz_enabled: "0",
  qz_printer_invoice: "",
  qz_printer_label: "",
  qz_certificate: "",
  qz_private_key: "",
};

const QUERY_KEY = ["shop_settings"] as const;

export async function getShopSettings(): Promise<ShopSettings> {
  const { data, error } = await supabase
    .from("shop_settings")
    .select("key, value");

  if (error) throw error;

  const result = { ...SETTINGS_DEFAULTS };
  for (const row of data ?? []) {
    if (row.key in result) {
      (result as Record<string, string>)[row.key] = row.value;
    }
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
