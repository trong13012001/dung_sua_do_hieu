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

Đặt tên máy in **trùng** chuỗi trong Windows (Cài đặt → Máy in) — trường `thermal_printer_invoice` trong Cài đặt shop hoặc env `NEXT_PUBLIC_THERMAL_PRINTER_INVOICE`.

## Ghi chú

- `thermal-print-html` chỉ chạy trên **Windows** (in silent driver).
- macOS/Linux: dùng trình duyệt hoặc agent `tools/silent-print-agent` nếu cần.
