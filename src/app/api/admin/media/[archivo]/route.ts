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

export async function GET(_req: Request, { params }: { params: Promise<{ archivo: string }> }) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { archivo } = await params;
  if (!/^[A-Za-z0-9._-]+$/.test(archivo)) {
    return NextResponse.json({ error: "nombre inválido" }, { status: 400 });
  }
  const r = await fetch(`${botBase()}/admin/media/${encodeURIComponent(archivo)}`, {
    cache: "no-store",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  if (!r.ok) {
    return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: r.status });
  }
  const buf = Buffer.from(await r.arrayBuffer());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": r.headers.get("content-type") || "application/octet-stream",
      "cache-control": "private, max-age=3600",
    },
  });
}
