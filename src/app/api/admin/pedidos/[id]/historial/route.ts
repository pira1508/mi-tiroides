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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const r = await fetch(`${botBase()}/admin/pedidos/${encodeURIComponent(id)}/historial`, {
    cache: "no-store",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  if (!r.ok) {
    return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: 502 });
  }
  const data = await r.json();
  return NextResponse.json(data);
}
