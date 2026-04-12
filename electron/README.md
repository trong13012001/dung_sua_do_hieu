# Electron shell — in im lặng (POS)

Ứng dụng Next.js trong trình duyệt **không** in silent được. Shell Electron bọc POS, preload expose `window.electronThermalPrint.printHtmlSilent` → `webContents.print({ silent: true })` qua **driver Windows**.

## Chạy dev

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run electron
```

**URL POS (ưu tiên):** `ELECTRON_START_URL` → `NEXT_PUBLIC_APP_URL` → mặc định **`https://dung-sua-do-hieu.vercel.app`** (hardcode trong `main.cjs` cho bản cài). Dev local: đặt `ELECTRON_START_URL=http://localhost:3000` trong `.env` hoặc shell.

`main.cjs` **tự nạp** (không dùng loader của Next), theo thứ tự:

1. `.env` / `.env.local` **cùng thư mục file `.exe`** (máy đã cài).
2. **`electron/.env.local`** hoặc `electron/.env` (cạnh `main.cjs`).
3. **Gốc repo** `.env.local` / `.env`.

Biến thường: không ghi đè nếu đã có giá trị trong `process.env`. Riêng `ELECTRON_START_URL` và `NEXT_PUBLIC_APP_URL`: **ghi đè nếu đang rỗng** (tránh Windows để sẵn biến trống khiến luôn rơi về localhost).

Ví dụ một dòng trong `.env.local` (hoặc `.env` cạnh `.exe`):

```env
NEXT_PUBLIC_APP_URL=https://pos.example.com
```

Lưu ý cổng LAN: phải là số thuần, ví dụ `http://192.168.1.235:3000/` — **không** viết `3000s` (dư chữ `s`). `main.cjs` tự sửa trường hợp `:3000s/` → `:3000/` nếu gặp.

Hoặc:

```env
ELECTRON_START_URL=https://pos.example.com
```

Chạy một lần với biến shell:

```bash
ELECTRON_START_URL=https://pos.example.com npm run electron
```

## Build installer

`electron-builder` **mặc định build cho đúng OS đang chạy lệnh** (trên Mac → `.dmg`/`.zip` Mac; trên Windows → NSIS `.exe`).

- **Cần bản cài Windows mà đang build trên Mac (hoặc Linux):**

```bash
npm run dist:electron:win
```

Script này ép **`--x64`** (Windows Intel/AMD). `electron-builder.yml` khai báo NSIS chỉ cho **`arch: [x64]`** trong mục `target` (đúng schema v25). Chỉ khi cần Windows ARM: `npm run dist:electron:win:arm64`.

- **Chỉ bản Mac (từ máy Mac):**

```bash
npm run dist:electron:mac
```

- **Theo OS hiện tại** (ít dùng khi mục tiêu là máy quầy Windows):

```bash
npm run dist:electron
```

Không dùng cờ kiểu `--window` sau `npm run` — đó không phải tham số của `electron-builder`. Cờ đúng là `--win` (đã gói trong `dist:electron:win`).

Bản ra thư mục `dist-electron/` (`electron-builder.yml`). Gói chỉ là shell Electron; app vẫn tải từ `ELECTRON_START_URL` / `NEXT_PUBLIC_APP_URL` khi chạy (đặt env trước khi build nếu cần URL production mặc định).

## Máy in

Một IPC `thermal-print-html` phục vụ **cả hóa đơn (XP-80C) và tem (XP-235B)**. Tên máy in phải **trùng ký tự** với Windows (Cài đặt → Máy in).

**Thứ tự dùng tên máy in trong app:** Cài đặt cửa hàng (DB) — đồng bộ vào bộ nhớ khi mở trang dashboard (`ShopSettingsSync`) và **ngay sau khi bấm Lưu** ở trang Cài đặt. Chỉ khi ô tương ứng trống mới fallback sang biến môi trường `NEXT_PUBLIC_THERMAL_PRINTER_*` (hữu ích cho máy dev hoặc bản build tĩnh).

| Loại | Cài đặt shop | Env (tuỳ chọn, khi DB trống) |
|------|----------------|---------------------------|
| Hóa đơn | `thermal_printer_invoice` | `NEXT_PUBLIC_THERMAL_PRINTER_INVOICE` (hoặc `NEXT_PUBLIC_THERMAL_PRINTER_XP80C`) |
| Tem | `thermal_printer_label` | `NEXT_PUBLIC_THERMAL_PRINTER_LABEL` (hoặc `NEXT_PUBLIC_THERMAL_PRINTER_XP235B`) |

Hai máy in khác nhau → cần **hai tên** đúng chỗ; để trống → Windows dùng **máy in mặc định** cho job đó (dễ nhầm máy).

## Ghi chú

- `thermal-print-html` chỉ chạy trên **Windows** (in silent driver).
- macOS/Linux: dùng trình duyệt hoặc agent `tools/silent-print-agent` nếu cần.
