"use client";

import type { WindowsPrinterOption } from "@/lib/print/electronPrintClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix Select không nhận value rỗng → dùng giá trị thay thế cho "máy in mặc định". */
const DEFAULT_PRINTER = "__default__";
const CUSTOM_PRINTER = "__custom__";

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
    selectValue = inList ? value : CUSTOM_PRINTER;
  }

  let labelFor = id;
  if (printers.length > 0 && selectValue !== CUSTOM_PRINTER) {
    labelFor = `${id}-select`;
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={labelFor} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      {printers.length > 0 && (
        <Select
          value={selectValue === "" ? DEFAULT_PRINTER : selectValue}
          onValueChange={(v) => {
            if (v === CUSTOM_PRINTER) {
              onChange(value);
              return;
            }
            onChange(v === DEFAULT_PRINTER ? "" : v);
          }}
        >
          <SelectTrigger id={`${id}-select`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_PRINTER}>(Máy in mặc định Windows)</SelectItem>
            {printers.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.displayName}
                {p.isDefault ? " ★" : ""} — {p.name}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_PRINTER}>Khác… (nhập tay)</SelectItem>
          </SelectContent>
        </Select>
      )}
      {(printers.length === 0 || selectValue === CUSTOM_PRINTER) && (
        <Input
          id={id}
          placeholder="Tên máy in (hệ thống hoặc hiển thị)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {loading && <Skeleton className="h-9 w-full" aria-label="Đang tải danh sách máy in" />}
    </div>
  );
}
