import type qz from "qz-tray";

let configured = false;

/**
 * Gọi một lần trước `qz.websocket.connect`.
 * Chứng chỉ public: `public/qz/digital-certificate.txt` (từ QZ Site Manager hoặc portal).
 * Chữ ký: `POST /api/qz/sign` (private key trên server, không đưa lên client).
 */
export function configureQzSecurity(qzMod: typeof qz): void {
  if (configured) return;
  configured = true;

  qzMod.security.setSignatureAlgorithm("SHA512");

  qzMod.security.setCertificatePromise(
    (resolve) => {
      fetch(`${globalThis.location.origin}/api/qz/cert`, {
        cache: "no-store",
        headers: { Accept: "text/plain" },
      })
        .then((r) => (r.ok ? r.text() : ""))
        .then((text) => resolve(text.trim()))
        .catch(() => resolve(""));
    },
    { rejectOnFailure: false },
  );

  qzMod.security.setSignaturePromise((toSign) => {
    return (resolve, reject) => {
      fetch(`${globalThis.location.origin}/api/qz/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/plain" },
        body: JSON.stringify({ request: toSign }),
        cache: "no-store",
      })
        .then((r) =>
          r.ok ? r.text() : r.text().then((t) => Promise.reject(new Error(t || r.statusText))),
        )
        .then(resolve)
        .catch(reject);
    };
  });
}
