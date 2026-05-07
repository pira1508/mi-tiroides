import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.json();

  if (!data?.nombre || !data?.telefono || !data?.cantidad) {
    return NextResponse.json({ error: "campos faltantes" }, { status: 400 });
  }

  const url = process.env.BOT_CONFIRMADOR_URL;
  const secret = process.env.BOT_CONFIRMADOR_SECRET;
  if (!url || !secret) {
    return NextResponse.json({ error: "config faltante" }, { status: 500 });
  }

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-secret": secret },
    body: JSON.stringify({ ...data, fuente: "landing-hashico", ts: Date.now() }),
  });

  if (!r.ok) {
    return NextResponse.json({ error: "bot-confirmador rechazo" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
