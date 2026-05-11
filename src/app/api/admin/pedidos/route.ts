import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const r = await fetch(`${BOT_BASE}/pedidos${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
    headers: { "x-secret": BOT_SECRET },
  });
  if (!r.ok) {
    return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: 502 });
  }
  const data = await r.json();
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id, estado } = await req.json();
  const r = await fetch(`${BOT_BASE}/pedidos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-secret": BOT_SECRET },
    body: JSON.stringify({ estado }),
  });
  const text = await r.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return NextResponse.json(data, { status: r.status });
}
