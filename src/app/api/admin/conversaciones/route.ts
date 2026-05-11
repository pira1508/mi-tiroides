import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

function botBase() {
  const url = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  return url.replace(/\/pedido\/?$/, "");
}

export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const tel = url.searchParams.get("telefono");
  const path = tel ? `/admin/conversaciones/${encodeURIComponent(tel)}` : `/admin/conversaciones`;
  const r = await fetch(`${botBase()}${path}`, {
    cache: "no-store",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  if (!r.ok) {
    return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: 502 });
  }
  const data = await r.json();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const r = await fetch(`${botBase()}/admin/enviar`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
