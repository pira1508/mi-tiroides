import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

type Preliminar = {
  id: string;
  nombre: string;
  telefono: string;
  departamento?: string;
  ciudad?: string;
  direccion?: string;
  referencia?: string;
  cantidad: number;
  dias_tratamiento?: number;
  total: number;
  estado: string;
  estado_preliminar_ts?: string;
  intentos_completar?: number;
  msg_faltantes?: string | null;
  creado_en: string;
  actualizado_en?: string;
};

export async function GET() {
  // Permitir auth tanto por cookie como por header x-secret (para compatibilidad)
  const c = await cookies();
  const cookieAuth = c.get("admin_session")?.value === "ok";

  if (!cookieAuth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
  const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";

  try {
    const r = await fetch(`${BOT_BASE}/admin/preliminares`, {
      cache: "no-store",
      headers: { "x-secret": BOT_SECRET },
    });

    if (!r.ok) {
      return NextResponse.json(
        { error: `Bot error: ${r.status}`, data: [] },
        { status: r.status }
      );
    }

    const preliminares: Preliminar[] = await r.json();
    return NextResponse.json(preliminares);
  } catch (e) {
    return NextResponse.json(
      { error: String(e), data: [] },
      { status: 502 }
    );
  }
}
