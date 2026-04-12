const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

/** GitHub Releases — `electron-builder --publish` tạo `app-update.yml` trong gói. */
let autoUpdater;
try {
  ({ autoUpdater } = require("electron-updater"));
} catch (e) {
  console.warn("[electron] electron-updater:", e?.message || e);
  autoUpdater = null;
}

function resolveWindowIconPath() {
  const p = path.join(__dirname, "build", "icon.png");
  return fs.existsSync(p) ? p : undefined;
}

function scheduleAutoUpdateFromGitHub() {
  if (!app.isPackaged || !autoUpdater) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  try {
    void autoUpdater.checkForUpdatesAndNotify();
  } catch (e) {
    console.warn("[electron] checkForUpdates:", e?.message || e);
  }
  globalThis.setInterval(() => {
    try {
      void autoUpdater.checkForUpdatesAndNotify();
    } catch {
      /* ignore */
    }
  }, 6 * 60 * 60 * 1000);
}

/**
 * Next.js tự đọc `.env.local`; tiến trình Electron (main) thì không.
 * Nạp: cạnh .exe → thư mục `electron/` → gốc repo.
 * URL POS: cho phép ghi đè nếu biến đang rỗng (Windows hay để NEXT_PUBLIC_* trống).
 */
const POS_URL_ENV_KEYS = new Set([
  "ELECTRON_START_URL",
  "NEXT_PUBLIC_APP_URL",
]);

function envValueIsBlank(v) {
  return v === undefined || String(v).trim() === "";
}

function shouldSetEnvFromFile(key, current) {
  if (current === undefined) return true;
  if (POS_URL_ENV_KEYS.has(key) && envValueIsBlank(current)) return true;
  return false;
}

function applyEnvLine(line) {
  let t = String(line).trim();
  if (!t || t.startsWith("#")) return;
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  const eq = t.indexOf("=");
  if (eq < 1) return;
  const key = t.slice(0, eq).trim();
  let val = t.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  if (key && shouldSetEnvFromFile(key, process.env[key])) {
    process.env[key] = val;
  }
}

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const text = fs.readFileSync(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) applyEnvLine(line);
    return true;
  } catch {
    return false;
  }
}

function loadElectronEnvFiles() {
  const exeDir = path.dirname(process.execPath);
  const repoRoot = path.join(__dirname, "..");
  const electronDir = __dirname;
  const paths = [
    path.join(exeDir, ".env"),
    path.join(exeDir, ".env.local"),
    path.join(electronDir, ".env.local"),
    path.join(electronDir, ".env"),
    path.join(repoRoot, ".env.local"),
    path.join(repoRoot, ".env"),
  ];
  for (const p of paths) {
    if (loadEnvFile(p)) {
      console.log("[electron] Đã nạp biến môi trường từ:", p);
    }
  }
}

loadElectronEnvFiles();

/** Mặc định khi không set env (bản cài quầy). Dev local: `ELECTRON_START_URL=http://localhost:3000`. */
const DEFAULT_POS_APP_URL = "https://dung-sua-do-hieu.vercel.app";

/**
 * Chuẩn hoá URL cho loadURL. Sửa lỗi gõ hay gặp: cổng `3000s` thay vì `3000` → `3000`.
 * @param {string} raw
 * @returns {string | null}
 */
function normalizePosLoadUrl(raw) {
  let u = String(raw ?? "").trim();
  if (!u) return null;
  const fixedPort = u.replace(/:(\d+)s(\/|\?|#|$)/g, ":$1$2");
  if (fixedPort !== u) {
    console.warn("[electron] Sửa nhầm cổng trong URL (vd. …:3000s/ → …:3000/):", u);
    u = fixedPort;
  }
  try {
    const p = new URL(u);
    if (p.protocol !== "http:" && p.protocol !== "https:") return null;
    return p.href;
  } catch {
    return null;
  }
}

const startUrlRaw =
  process.env.ELECTRON_START_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "";

let startUrl = normalizePosLoadUrl(startUrlRaw || DEFAULT_POS_APP_URL);
if (!startUrl) {
  console.error(
    "[electron] URL không hợp lệ, dùng mặc định:",
    startUrlRaw || "(trống)",
    "→",
    DEFAULT_POS_APP_URL,
  );
  startUrl = normalizePosLoadUrl(DEFAULT_POS_APP_URL) ?? DEFAULT_POS_APP_URL;
}

console.log("[electron] Mở POS tại:", startUrl);

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    icon: resolveWindowIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.loadURL(startUrl).catch((err) => {
    console.error("[electron] loadURL failed:", err);
  });

  return win;
}

ipcMain.handle("thermal-print-html", async (_event, { html, deviceName }) => {
  if (typeof html !== "string" || !html.length) {
    throw new Error("Thiếu HTML.");
  }

  if (process.platform !== "win32") {
    throw new Error("In im lặng Electron hiện chỉ hỗ trợ Windows.");
  }

  const safeName = `thermal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.html`;
  const tmpPath = path.join(os.tmpdir(), safeName);

  fs.writeFileSync(tmpPath, html, "utf8");

  /* Khổ hẹp ~ 58mm nhiệt: viewport rộng (mặc định ~800px) khiến layout + phân trang lệch so với @page mm. */
  const printWin = new BrowserWindow({
    show: false,
    width: 280,
    height: 1400,
    webPreferences: {
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      /* file:// + <base href="http://…"> tải ảnh/font từ POS — tránh chặn mixed context */
      webSecurity: false,
    },
  });

  try {
    await printWin.loadFile(tmpPath);
    if (!printWin.isDestroyed()) {
      try {
        await printWin.webContents.executeJavaScript(
          "document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()",
          true,
        );
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    const opts = {
      silent: true,
      printBackground: true,
      /* Windows: mặc định hay bỏ qua @page mm → A4 + cắt/lệch; bật theo CSS + tắt margin hệ thống. */
      margins: { marginType: "none" },
      preferCSSPageSize: true,
    };
    const dn = typeof deviceName === "string" ? deviceName.trim() : "";
    if (dn) opts.deviceName = dn;

    /**
     * `webContents.print` không trả Promise — `await print()` trước đây không chờ
     * driver Windows; `destroy()` có thể chạy sớm và job in không ra giấy.
     */
    await new Promise((resolve, reject) => {
      try {
        printWin.webContents.print(opts, (success, failureReason) => {
          if (success) resolve(undefined);
          else {
            const msg = String(failureReason || "").trim() || "In im lặng thất bại.";
            console.error(
              "[electron] thermal-print-html:",
              msg,
              dn ? `(deviceName: ${dn})` : "(máy in mặc định)",
            );
            reject(new Error(msg));
          }
        });
      } catch (e) {
        reject(e);
      }
    });
    return { ok: true };
  } finally {
    printWin.destroy();
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
  }
});

app.whenReady().then(() => {
  scheduleAutoUpdateFromGitHub();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
