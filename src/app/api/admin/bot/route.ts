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
  if (!tel) return NextResponse.json({ error: "telefono requerido" }, { status: 400 });
  const r = await fetch(`${botBase()}/admin/bot/status/${encodeURIComponent(tel)}`, {
    cache: "no-store",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}

export async function POST(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { telefono, action } = await req.json();
  if (!telefono || !["pause", "resume"].includes(action)) {
    return NextResponse.json({ error: "telefono y action (pause|resume) requeridos" }, { status: 400 });
  }
  const r = await fetch(`${botBase()}/admin/bot/${action}/${encodeURIComponent(telefono)}`, {
    method: "POST",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
