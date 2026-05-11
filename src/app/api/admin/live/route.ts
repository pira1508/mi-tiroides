import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
  const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";

  try {
    const r = await fetch(`${BOT_BASE}/admin/live`, {
      cache: "no-store",
      headers: { "x-secret": BOT_SECRET },
    });
    if (!r.ok) return NextResponse.json({ active: 0, viewsLastMin: 0, users5min: 0 });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ active: 0, viewsLastMin: 0, users5min: 0 });
  }
}
