import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
  const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";
  const id = params.id;
  const url = new URL(req.url);
  const action = url.pathname.split("/").pop();

  let endpoint = "";
  if (action === "confirmar") {
    endpoint = `${BOT_BASE}/admin/preliminares/${id}/confirmar`;
  } else if (action === "descartar" || action === "cancelar") {
    endpoint = `${BOT_BASE}/admin/preliminares/${id}/cancelar`;
  } else {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { "x-secret": BOT_SECRET },
      cache: "no-store",
    });

    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json(
        { error: `Bot error: ${r.status}`, details: txt },
        { status: r.status }
      );
    }

    const result = await r.json();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
