import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
  const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";

  try {
    const body = await req.json();
    const ref = req.headers.get("referer") || "";
    const ua = req.headers.get("user-agent") || "";
    const variant = body.variant || (/\/v2/.test(ref) ? "v2" : "v1");
    await fetch(`${BOT_BASE}/track`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-secret": BOT_SECRET,
        referer: ref,
        "user-agent": ua,
      },
      body: JSON.stringify({ ...body, variant }),
    });
  } catch {
    // no-op
  }
  return NextResponse.json({ ok: true });
}
