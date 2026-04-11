'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Store, Printer, ShieldCheck, Upload, Loader2 } from 'lucide-react';
import { Toast, useToast } from '@/components/ui/Toast';
import { useShopSettings, useUpdateShopSettings, type ShopSettings } from '@/api/shopSettings';

function FileOrPasteField({
  label,
  value,
  onChange,
  placeholder,
  id,
}: Readonly<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
}>) {
  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      onChange(text);
      e.target.value = '';
    },
    [onChange],
  );

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
        {label}
      </label>
      <textarea
        id={id}
        className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm font-mono min-h-[100px] resize-y"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <label className="inline-flex items-center gap-1.5 text-xs font-medium text-primary cursor-pointer hover:opacity-80">
        <Upload size={14} />
        <span>Upload file</span>
        <input type="file" accept=".txt,.pem,.crt,.cer" className="hidden" onChange={handleFile} aria-label={`Upload ${label}`} />
      </label>
    </div>
  );
}

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
    qz_enabled: '0',
    qz_printer_invoice: '',
    qz_printer_label: '',
    qz_certificate: '',
    qz_private_key: '',
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

        {/* QZ Tray */}
        <div className="vuexy-card p-6 md:p-8">
          <h5 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
            <Printer size={18} className="text-primary" /> Cấu hình máy in (QZ Tray)
          </h5>
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <label htmlFor="qz_toggle" className="relative inline-flex items-center cursor-pointer" aria-label="Bật/tắt QZ Tray">
                <input
                  id="qz_toggle"
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.qz_enabled === '1'}
                  onChange={(e) => update('qz_enabled', e.target.checked ? '1' : '0')}
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm font-medium text-foreground">
                {form.qz_enabled === '1' ? 'QZ Tray đang bật' : 'QZ Tray đang tắt'}
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Khi bật QZ Tray, hệ thống gửi lệnh in trực tiếp tới máy in mà không cần mở hộp thoại trình duyệt.
              Máy quầy cần cài <a href="https://qz.io/download/" target="_blank" rel="noreferrer" className="text-primary underline">QZ Tray</a>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label htmlFor="qz_printer_invoice" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                  Máy in hóa đơn (80mm)
                </label>
                <input
                  id="qz_printer_invoice"
                  className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                  placeholder="vd: XP-80C"
                  value={form.qz_printer_invoice}
                  onChange={(e) => update('qz_printer_invoice', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="qz_printer_label" className="text-[11px] font-bold text-muted-foreground uppercase opacity-80">
                  Máy in tem nhãn (58mm)
                </label>
                <input
                  id="qz_printer_label"
                  className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
                  placeholder="vd: XP-235B"
                  value={form.qz_printer_label}
                  onChange={(e) => update('qz_printer_label', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* QZ Certificates */}
        <div className="vuexy-card p-6 md:p-8">
          <h5 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" /> Chứng chỉ QZ Tray
          </h5>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            Paste nội dung hoặc upload file chứng chỉ từ QZ Tray Site Manager.
            Khi đổi máy POS, chỉ cần upload lại 2 file này.
          </p>
          <div className="space-y-5">
            <FileOrPasteField
              id="qz_certificate"
              label="Digital Certificate (public)"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              value={form.qz_certificate}
              onChange={(v) => update('qz_certificate', v)}
            />
            <FileOrPasteField
              id="qz_private_key"
              label="Private Key (bảo mật)"
              placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
              value={form.qz_private_key}
              onChange={(v) => update('qz_private_key', v)}
            />
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
