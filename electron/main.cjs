const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

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

const startUrlRaw =
  process.env.ELECTRON_START_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "";
const startUrl = startUrlRaw || DEFAULT_POS_APP_URL;

console.log("[electron] Mở POS tại:", startUrl);

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
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

  const printWin = new BrowserWindow({
    show: false,
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
    };
    const dn = typeof deviceName === "string" ? deviceName.trim() : "";
    if (dn) opts.deviceName = dn;

    await printWin.webContents.print(opts);
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
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
