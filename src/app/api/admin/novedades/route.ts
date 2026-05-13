import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

function botBase() {
  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  return BOT_URL.replace(/\/pedido\/?$/, "");
}

export async function GET(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const soloActivas = searchParams.get("activas") === "1";
  const r = await fetch(`${botBase()}/admin/novedades${soloActivas ? "?activas=1" : ""}`, {
    cache: "no-store",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  if (!r.ok) return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: 502 });
  const rows = await r.json();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { pedidoId, nota } = body as { pedidoId?: string; nota?: string };
  if (!pedidoId) return NextResponse.json({ error: "missing pedidoId" }, { status: 400 });
  const r = await fetch(`${botBase()}/admin/novedades/${encodeURIComponent(pedidoId)}/resolver`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
    body: JSON.stringify({ nota: nota || "" }),
  });
  if (!r.ok) return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: 502 });
  return NextResponse.json(await r.json());
}
