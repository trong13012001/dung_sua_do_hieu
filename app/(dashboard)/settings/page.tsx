'use client';

import React, { useState, useEffect } from 'react';
import { Save, Store, Printer, Loader2 } from 'lucide-react';
import { Toast, useToast } from '@/components/ui/Toast';
import { useShopSettings, useUpdateShopSettings, type ShopSettings } from '@/api/shopSettings';
import { syncThermalPrintersFromShop } from '@/lib/print/shopPrinterCache';

export default function SettingsPage() {
  const { data: settings, isLoading } = useShopSettings();
  const { mutateAsync: save, isPending: isSaving } = useUpdateShopSettings();
  const { toast, showToast, hideToast } = useToast();

  const [form, setForm] = useState<ShopSettings>({
    shop_name: '',
    shop_hotline: '',
    shop_address: '',
    bank_name: '',
    bank_account: '',
    bank_account_holder: '',
    thermal_printer_invoice: '',
    thermal_printer_label: '',
  });

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const update = (key: keyof ShopSettings, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save(form);
      syncThermalPrintersFromShop({
        thermal_printer_invoice: form.thermal_printer_invoice,
        thermal_printer_label: form.thermal_printer_label,
      });
      showToast('Đã lưu cài đặt thành công!', 'success');
    } catch (err) {
      showToast('Lỗi: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h4 className="text-lg md:text-xl font-bold text-foreground">Cài đặt cửa hàng</h4>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shop info */}
        <div className="vuexy-card p-6 md:p-8">
          <h5 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
            <Store size={18} className="text-primary" /> Thông tin cửa hàng
          </h5>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="shop_name" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                  Tên cửa hàng
                </label>
                <input
                  id="shop_name"
                  className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={form.shop_name}
                  onChange={(e) => update('shop_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="shop_hotline" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                  Hotline
                </label>
                <input
                  id="shop_hotline"
                  className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={form.shop_hotline}
                  onChange={(e) => update('shop_hotline', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="shop_address" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                Địa chỉ
              </label>
              <input
                id="shop_address"
                className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                placeholder="(Tùy chọn)"
                value={form.shop_address}
                onChange={(e) => update('shop_address', e.target.value)}
              />
            </div>

            <div className="border-t border-border pt-5">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-4">Thông tin ngân hàng (hiện trên hóa đơn)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label htmlFor="bank_name" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                    Tên ngân hàng
                  </label>
                  <input
                    id="bank_name"
                    className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                    value={form.bank_name}
                    onChange={(e) => update('bank_name', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="bank_account_holder" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                    Chủ tài khoản
                  </label>
                  <input
                    id="bank_account_holder"
                    className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                    value={form.bank_account_holder}
                    onChange={(e) => update('bank_account_holder', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5 mt-5">
                <label htmlFor="bank_account" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                  Số tài khoản
                </label>
                <input
                  id="bank_account"
                  className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={form.bank_account}
                  onChange={(e) => update('bank_account', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Máy in nhiệt — dùng với Electron (silent) hoặc hộp thoại in Chrome */}
        <div className="vuexy-card p-6 md:p-8">
          <h5 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
            <Printer size={18} className="text-primary" /> Máy in nhiệt (Windows)
          </h5>
          <div className="space-y-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              In im lặng: chạy POS bằng ứng dụng Electron hoặc agent{' '}
              <code className="text-foreground">tools/silent-print-agent</code>. Tên máy in phải{' '}
              <span className="font-semibold text-foreground">trùng y hệt</span> chuỗi trong Cài đặt Windows → Máy in.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="thermal_printer_invoice" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                  Máy in hóa đơn (80mm)
                </label>
                <input
                  id="thermal_printer_invoice"
                  className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                  placeholder="vd: XP-80C"
                  value={form.thermal_printer_invoice}
                  onChange={(e) => update('thermal_printer_invoice', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="thermal_printer_label" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                  Máy in tem nhãn (58mm)
                </label>
                <input
                  id="thermal_printer_label"
                  className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                  placeholder="vd: XP-235B"
                  value={form.thermal_printer_label}
                  onChange={(e) => update('thermal_printer_label', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary px-6 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
}
