/**
 * CI: gán version semver duy nhất theo GITHUB_RUN_NUMBER để electron-updater so sánh với GitHub Release.
 * Chỉ chạy khi biến GITHUB_RUN_NUMBER có giá trị (workflow push main).
 */
const fs = require("node:fs");
const path = require("node:path");

const run = process.env.GITHUB_RUN_NUMBER;
if (!run || String(run).trim() === "") {
  process.exit(0);
}

const pkgPath = path.join(__dirname, "..", "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const m = String(pkg.version || "1.0.0").match(/^(\d+)\.(\d+)/);
const maj = m ? m[1] : "1";
const min = m ? m[2] : "0";
pkg.version = `${maj}.${min}.${run}`;

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("[electron] CI package.json version →", pkg.version);
