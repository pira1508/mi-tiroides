import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

type BotRow = {
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
  estado: "nuevo" | "confirmado" | "despachado" | "entregado" | "cancelado";
  guia?: string;
  transportadora?: string;
  creado_en: string;
  actualizado_en?: string;
  variant?: string | null;
};

function fechaBogota(iso: string): string {
  const d = new Date(iso);
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
  const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";

  const r = await fetch(`${BOT_BASE}/admin/pedidos`, {
    cache: "no-store",
    headers: { "x-secret": BOT_SECRET },
  });
  if (!r.ok) {
    return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: 502 });
  }
  const rows = (await r.json()) as BotRow[];

  const pedidos = rows.map((row) => ({
    id: row.id,
    nombre: row.nombre || "—",
    telefonoCliente: row.telefono || "",
    ciudad: row.ciudad || "",
    departamento: row.departamento || "",
    direccion: row.direccion || "",
    referencia: row.referencia,
    cantidad: Number(row.cantidad || 0),
    diasTratamiento: Number(row.dias_tratamiento || row.cantidad * 45 || 0),
    total: Number(row.total || 0),
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    estado: row.estado,
  }));

  // A/B Testing: agrupar por variant
  const v1Rows = rows.filter((r) => r.variant === "v1" && r.estado !== "cancelado");
  const v2Rows = rows.filter((r) => r.variant === "v2" && r.estado !== "cancelado");

  const ab = {
    v1: {
      visitasHoy: 0,
      aperturasHoy: 0,
      pedidosHoy: 0,
      visitasTotal: 0, // TODO: traer del bot cuando exponga eventos
      aperturasTotal: 0,
      pedidosTotal: v1Rows.length,
      ingresos: v1Rows.reduce((a, r) => a + Number(r.total || 0), 0),
    },
    v2: {
      visitasHoy: 0,
      aperturasHoy: 0,
      pedidosHoy: 0,
      visitasTotal: 0,
      aperturasTotal: 0,
      pedidosTotal: v2Rows.length,
      ingresos: v2Rows.reduce((a, r) => a + Number(r.total || 0), 0),
    },
  };

  const stats = {
    total: pedidos.length,
    nuevos: pedidos.filter((p) => p.estado === "nuevo").length,
    confirmados: pedidos.filter((p) => p.estado === "confirmado").length,
    despachados: pedidos.filter((p) => p.estado === "despachado").length,
    entregados: pedidos.filter((p) => p.estado === "entregado").length,
    cancelados: pedidos.filter((p) => p.estado === "cancelado").length,
    ingresosTotales: pedidos.filter((p) => p.estado !== "cancelado").reduce((a, p) => a + p.total, 0),
    visitasHoy: 0,
    aperturasHoy: 0,
    pedidosHoy: 0,
    visitasTotal: 0,
    aperturasTotal: 0,
    rango: { from: "", to: "", hoy: fechaBogota(new Date().toISOString()) },
    ab,
  };

  return NextResponse.json({ pedidos, stats });
}

export async function PATCH(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
  const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";
  const { id, estado } = await req.json();
  const r = await fetch(`${BOT_BASE}/pedido/${encodeURIComponent(id)}/estado`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-secret": BOT_SECRET },
    body: JSON.stringify({ estado }),
  });
  const text = await r.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return NextResponse.json(data, { status: r.status });
}
