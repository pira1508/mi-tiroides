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

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const r = await fetch(`${botBase()}/admin/atencion-requerida`, {
    cache: "no-store",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  if (!r.ok) return NextResponse.json({ error: "bot fetch failed" }, { status: 502 });
  return NextResponse.json(await r.json());
}

export async function POST(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { pedidoId } = await req.json();
  if (!pedidoId) return NextResponse.json({ error: "pedidoId requerido" }, { status: 400 });
  const r = await fetch(`${botBase()}/admin/atencion-requerida/${encodeURIComponent(pedidoId)}/resolver`, {
    method: "POST",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  return NextResponse.json(await r.json(), { status: r.status });
}
