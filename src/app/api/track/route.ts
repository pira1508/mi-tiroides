import { NextResponse } from "next/server";

const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ua = req.headers.get("user-agent") || "";
    const ref = req.headers.get("referer") || "";
    await fetch(`${BOT_BASE}/track`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": ua, referer: ref },
      body: JSON.stringify(body),
    });
  } catch {
    // no-op
  }
  return NextResponse.json({ ok: true });
}
