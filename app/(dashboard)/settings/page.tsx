'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Save, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useShopSettings, useUpdateShopSettings, type ShopSettings } from '@/api/shopSettings';
import { syncThermalPrintersFromShop } from '@/lib/print/shopPrinterCache';
import { isElectronPrinterListAvailable, listThermalPrintersFromElectron } from '@/lib/print/electronPrintClient';
import { errorMessage } from '@/lib/utils';
import { WindowsPrinterPicker } from '@/components/settings/WindowsPrinterPicker';
import { FormSkeleton } from '@/components/ui/loading-skeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/common/PageHeader';
import { FormField } from '@/components/common/FormField';

const EMPTY_SETTINGS: ShopSettings = {
  shop_name: '',
  shop_hotline: '',
  shop_address: '',
  bank_name: '',
  bank_account: '',
  bank_account_holder: '',
  thermal_printer_invoice: '',
  thermal_printer_label: '',
};

type TextKey = Exclude<keyof ShopSettings, 'thermal_printer_invoice' | 'thermal_printer_label'>;

export default function SettingsPage() {
  const { data: settings, isLoading } = useShopSettings();
  const { mutateAsync: save, isPending: isSaving } = useUpdateShopSettings();

  // Chỉ giữ phần người dùng đã sửa; phần còn lại lấy từ DB (khỏi useEffect chép settings vào state).
  const [draft, setDraft] = useState<Partial<ShopSettings>>({});
  const form = useMemo<ShopSettings>(() => ({ ...EMPTY_SETTINGS, ...settings, ...draft }), [settings, draft]);

  // Danh sách máy in chỉ có khi chạy trong Electron trên Windows.
  const electronAvailable = typeof window !== 'undefined' && isElectronPrinterListAvailable();
  const { data: winPrinters = [], isFetching: printersLoading } = useQuery({
    queryKey: ['electron-printers'],
    queryFn: listThermalPrintersFromElectron,
    enabled: electronAvailable,
    staleTime: Infinity,
  });

  const update = (key: keyof ShopSettings, value: string) => setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save(form);
      syncThermalPrintersFromShop({
        thermal_printer_invoice: form.thermal_printer_invoice,
        thermal_printer_label: form.thermal_printer_label,
      });
      setDraft({});
      toast.success('Đã lưu cài đặt thành công!');
    } catch (err) {
      toast.error('Lỗi: ' + errorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <FormSkeleton fields={3} />
        <FormSkeleton fields={2} />
      </div>
    );
  }

  const textField = (key: TextKey, label: string, placeholder?: string) => (
    <FormField label={label} htmlFor={key}>
      <Input id={key} placeholder={placeholder} value={form[key]} onChange={(e) => update(key, e.target.value)} />
    </FormField>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Cài đặt cửa hàng" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store size={18} className="text-primary" /> Thông tin cửa hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {textField('shop_name', 'Tên cửa hàng')}
              {textField('shop_hotline', 'Hotline')}
            </div>
            {textField('shop_address', 'Địa chỉ', '(Tùy chọn)')}

            <Separator />
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Thông tin ngân hàng (hiện trên hóa đơn)
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {textField('bank_name', 'Tên ngân hàng')}
              {textField('bank_account_holder', 'Chủ tài khoản')}
            </div>
            {textField('bank_account', 'Số tài khoản')}
          </CardContent>
        </Card>

        {/* Máy in nhiệt — dùng với Electron (silent) hoặc hộp thoại in Chrome */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Printer size={18} className="text-primary" /> Máy in nhiệt (Windows)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              In im lặng: chạy POS bằng ứng dụng Electron trên Windows — danh sách máy in tải tự động; giá trị lưu là{' '}
              <span className="font-semibold text-foreground">tên hệ thống</span> (cột sau dấu — trong menu). Mở Cài đặt
              trong trình duyệt thì nhập tay như trước. Để trống → máy in mặc định Windows.
            </p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <WindowsPrinterPicker
                id="thermal_printer_invoice"
                label="Máy in hóa đơn (80mm)"
                value={form.thermal_printer_invoice}
                onChange={(v) => update('thermal_printer_invoice', v)}
                printers={winPrinters}
                loading={printersLoading}
              />
              <WindowsPrinterPicker
                id="thermal_printer_label"
                label="Máy in tem nhãn (USER 3x4in)"
                value={form.thermal_printer_label}
                onChange={(v) => update('thermal_printer_label', v)}
                printers={winPrinters}
                loading={printersLoading}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSaving}>
          <Save /> {isSaving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
      </form>
    </div>
  );
}
