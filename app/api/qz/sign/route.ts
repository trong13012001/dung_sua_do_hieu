import { createSign } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

async function loadPrivateKeyPem(): Promise<string | null> {
  try {
    const sb = createSupabaseAdmin();
    const { data, error } = await sb
      .from("shop_settings")
      .select("value")
      .eq("key", "qz_private_key")
      .single();

    if (!error && data?.value?.trim()) return data.value.trim();
  } catch { /* fall through to file/env */ }

  const fromEnv = process.env.QZ_PRIVATE_KEY?.replaceAll("\\n", "\n")?.trim();
  if (fromEnv) return fromEnv;

  const root = join(process.cwd(), "qz-private-key.pem");
  if (existsSync(root)) {
    return readFileSync(root, "utf8");
  }
  return null;
}

export async function POST(req: Request) {
  let body: { request?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = body.request;
  if (typeof message !== "string" || !message.length) {
    return NextResponse.json({ error: "Missing request" }, { status: 400 });
  }

  const pem = await loadPrivateKeyPem();
  if (!pem) {
    return NextResponse.json(
      {
        error:
          "QZ signing chưa cấu hình: vào Cài đặt > QZ Tray để upload private key, hoặc đặt QZ_PRIVATE_KEY trong .env.local.",
      },
      { status: 503 },
    );
  }

  try {
    const sign = createSign("RSA-SHA512");
    sign.update(message);
    sign.end();
    const signature = sign.sign(pem, "base64");
    return new NextResponse(signature, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: "Ký thất bại — kiểm tra private key khớp với digital-certificate.txt" },
      { status: 500 },
    );
  }
}
