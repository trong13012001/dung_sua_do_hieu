"use client";

import type { WindowsPrinterOption } from "@/lib/print/electronPrintClient";

export interface WindowsPrinterPickerProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly printers: readonly WindowsPrinterOption[];
  readonly loading: boolean;
}

/**
 * Chọn máy in Windows (Electron): lưu `name` hệ thống; có thể nhập tay khi không có danh sách.
 */
export function WindowsPrinterPicker({
  id,
  label,
  value,
  onChange,
  printers,
  loading,
}: WindowsPrinterPickerProps) {
  const inList = printers.some((p) => p.name === value);
  let selectValue = "";
  if (value !== "") {
    selectValue = inList ? value : "__custom__";
  }

  let labelFor = id;
  if (printers.length > 0 && selectValue !== "__custom__") {
    labelFor = `${id}-select`;
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={labelFor}
        className="text-[11px] font-bold text-muted-foreground uppercase opacity-80"
      >
        {label}
      </label>
      {printers.length > 0 && (
        <select
          id={`${id}-select`}
          className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              onChange(value);
              return;
            }
            onChange(v);
          }}
        >
          <option value="">(Máy in mặc định Windows)</option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName}
              {p.isDefault ? " ★" : ""} — {p.name}
            </option>
          ))}
          <option value="__custom__">Khác… (nhập tay)</option>
        </select>
      )}
      {(printers.length === 0 || selectValue === "__custom__") && (
        <input
          id={id}
          className="w-full bg-muted/20 border border-border rounded-md px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary text-sm"
          placeholder="Tên máy in (hệ thống hoặc hiển thị)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {loading && (
        <p className="text-[11px] text-muted-foreground">Đang tải danh sách máy in…</p>
      )}
    </div>
  );
}
