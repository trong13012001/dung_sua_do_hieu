/**
 * Chuẩn bị icon cho electron-builder: copy logo thương hiệu → electron/build/icon.png
 * (Windows/macOS dùng file này; builder có thể sinh .ico từ .png).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const src = path.join(root, "public", "brand-logo.png");
const destDir = path.join(__dirname, "..", "build");
const dest = path.join(destDir, "icon.png");

if (!fs.existsSync(src)) {
  console.error("[electron] Không tìm thấy", src, "— đặt logo PNG vào public/brand-logo.png");
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("[electron] Đã copy icon build:", dest);
