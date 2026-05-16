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
  estado: string;
  guia?: string;
  transportadora?: string;
  creado_en: string;
  actualizado_en?: string;
  variant?: string | null;
  novedad_resolucion?: string | null;
  novedad_tipo?: string | null;
  novedad_inicio?: string | null;
  motivo_no_entrega?: string | null;
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

  const [r, rEv] = await Promise.all([
    fetch(`${BOT_BASE}/admin/pedidos`, {
      cache: "no-store",
      headers: { "x-secret": BOT_SECRET },
    }),
    fetch(`${BOT_BASE}/admin/eventos`, {
      cache: "no-store",
      headers: { "x-secret": BOT_SECRET },
    }).catch(() => null),
  ]);
  if (!r.ok) {
    return NextResponse.json({ error: "bot fetch failed", status: r.status }, { status: 502 });
  }
  const rows = (await r.json()) as BotRow[];

  // Eventos por variant (visitas + aperturas)
  type EventRow = { tipo: string; variant: string | null; total: number };
  type EventosResp = EventRow[] | { historico: EventRow[]; hoy: EventRow[] };
  const eventosResp: EventosResp = rEv && rEv.ok ? await rEv.json().catch(() => []) : [];
  const historico: EventRow[] = Array.isArray(eventosResp) ? eventosResp : (eventosResp.historico ?? []);
  const hoy: EventRow[] = Array.isArray(eventosResp) ? [] : (eventosResp.hoy ?? []);
  const evCount = (rows: EventRow[], tipo: string, variant: string) =>
    rows.find((e) => e.tipo === tipo && e.variant === variant)?.total ?? 0;

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
    guia: row.guia || null,
    transportadora: row.transportadora || null,
    novedadResolucion: row.novedad_resolucion || null,
    novedadTipo: row.novedad_tipo || null,
    novedadInicio: row.novedad_inicio || null,
    motivoNoEntrega: row.motivo_no_entrega || null,
  }));

  // A/B Testing: agrupar por variant
  const v1Rows = rows.filter((r) => r.variant === "v1" && r.estado !== "cancelado");
  const v2Rows = rows.filter((r) => r.variant === "v2" && r.estado !== "cancelado");
  const hoyStr = fechaBogota(new Date().toISOString());
  const v1Hoy = v1Rows.filter((r) => fechaBogota(r.creado_en) === hoyStr);
  const v2Hoy = v2Rows.filter((r) => fechaBogota(r.creado_en) === hoyStr);

  const ab = {
    v1: {
      visitasHoy: evCount(hoy, "view", "v1"),
      aperturasHoy: evCount(hoy, "open_form", "v1"),
      pedidosHoy: v1Hoy.length,
      visitasTotal: evCount(historico, "view", "v1"),
      aperturasTotal: evCount(historico, "open_form", "v1"),
      pedidosTotal: v1Rows.length,
      ingresos: v1Rows.reduce((a, r) => a + Number(r.total || 0), 0),
    },
    v2: {
      visitasHoy: evCount(hoy, "view", "v2"),
      aperturasHoy: evCount(hoy, "open_form", "v2"),
      pedidosHoy: v2Hoy.length,
      visitasTotal: evCount(historico, "view", "v2"),
      aperturasTotal: evCount(historico, "open_form", "v2"),
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
    visitasHoy: ab.v1.visitasHoy + ab.v2.visitasHoy,
    aperturasHoy: ab.v1.aperturasHoy + ab.v2.aperturasHoy,
    pedidosHoy: ab.v1.pedidosHoy + ab.v2.pedidosHoy,
    visitasTotal: ab.v1.visitasTotal + ab.v2.visitasTotal,
    aperturasTotal: ab.v1.aperturasTotal + ab.v2.aperturasTotal,
    rango: { from: "", to: "", hoy: hoyStr },
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
