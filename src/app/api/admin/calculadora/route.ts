import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

type BotPedido = {
  id: string;
  telefono: string;
  cantidad: number;
  total: number;
  estado: string;
  creado_en: string;
  motivo_no_entrega?: string;
};

// Conjuntos de estados para clasificar pedidos
// "cancelado" = el cliente no confirmó / no se despachó → NO cuenta como devolución,
// solo se excluye del facturado.
// Devolución = pedido despachado que regresó sin entregarse (pagamos flete igual).
const ESTADOS_DESPACHADOS = new Set([
  "subido_hoko",
  "en_bodega",
  "guia_generada",
  "guia_activa",
  "despachado",
  "en_reparto",
  "mercancia_recogida",
  "entregado",
  "novedad",
  "devolucion",
]);
const ESTADOS_ENTREGADOS = new Set(["entregado"]);
const ESTADOS_DEVUELTOS = new Set(["devolucion"]);
const ESTADOS_CANCELADOS = new Set(["cancelado"]);

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function dentroRango(creado: string, from: Date | null, to: Date | null): boolean {
  const d = new Date(creado);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

async function fetchPedidos(from: Date | null, to: Date | null): Promise<BotPedido[]> {
  const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
  const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
  const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";
  const r = await fetch(`${BOT_BASE}/admin/pedidos`, {
    cache: "no-store",
    headers: { "x-secret": BOT_SECRET },
  });
  if (!r.ok) throw new Error(`bot pedidos fetch failed ${r.status}`);
  const rows = (await r.json()) as BotPedido[];
  return rows.filter((p) => dentroRango(p.creado_en, from, to));
}

async function fetchMetaSpend(from: Date | null, to: Date | null): Promise<number> {
  const META_TOKEN = process.env.META_ACCESS_TOKEN || "";
  const ACT_RAW = process.env.META_AD_ACCOUNT_ID || "598280937285029";
  const ACT_ID = ACT_RAW.startsWith("act_") ? ACT_RAW : `act_${ACT_RAW}`;
  if (!META_TOKEN || !from || !to) return 0;

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const u = new URL(`https://graph.facebook.com/v21.0/${ACT_ID}/insights`);
  u.searchParams.set("fields", "spend");
  u.searchParams.set("time_range", JSON.stringify({ since: fmt(from), until: fmt(to) }));
  u.searchParams.set("access_token", META_TOKEN);

  try {
    const r = await fetch(u.toString(), { cache: "no-store" });
    if (!r.ok) return 0;
    const data = await r.json();
    const rows = (data.data ?? []) as Array<{ spend?: string }>;
    return rows.reduce((sum, row) => sum + parseFloat(row.spend ?? "0"), 0);
  } catch {
    return 0;
  }
}

export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const from = parseDate(fromStr);
  const to = parseDate(toStr ? `${toStr}T23:59:59` : null);

  try {
    const [pedidos, pautaGastada] = await Promise.all([
      fetchPedidos(from, to),
      fetchMetaSpend(from, to),
    ]);

    // Agrupar
    // Reglas (alineadas con el sheet):
    // - "nuevo" y "cancelado" NO cuentan como facturado. Cancelado = no se despachó.
    // - "Facturado" = pedidos confirmados (excluyendo cancelados sin despacho).
    // - "Despachado" = subset de facturados que salió de bodega.
    // - "Entregado" = subset de despachados que llegó al cliente.
    // - "Devolución" = despachado que regresó (paga flete igual).
    let totalPedidos = 0;
    let totalDespachados = 0;
    let totalEntregados = 0;
    let totalDevueltos = 0;
    let totalNovedades = 0;
    let totalCancelados = 0;
    let facturadoBruto = 0;
    let entregadoFacturado = 0;
    let unidadesFacturadas = 0;
    let unidadesDespachadas = 0;

    for (const p of pedidos) {
      if (p.estado === "nuevo") continue;
      if (ESTADOS_CANCELADOS.has(p.estado)) {
        // Cancelado = no se confirmó / no se despachó → solo lo contamos para info.
        totalCancelados++;
        continue;
      }
      totalPedidos++;
      facturadoBruto += Number(p.total) || 0;
      unidadesFacturadas += Number(p.cantidad) || 0;

      if (ESTADOS_DESPACHADOS.has(p.estado)) {
        totalDespachados++;
        unidadesDespachadas += Number(p.cantidad) || 0;
      }
      if (ESTADOS_ENTREGADOS.has(p.estado)) {
        totalEntregados++;
        entregadoFacturado += Number(p.total) || 0;
      }
      if (ESTADOS_DEVUELTOS.has(p.estado)) totalDevueltos++;
      if (p.estado === "novedad") totalNovedades++;
    }

    const tasaDespachos = totalPedidos > 0 ? totalDespachados / totalPedidos : 0;
    const tasaEntrega = totalDespachados > 0 ? totalEntregados / totalDespachados : 0;
    const tasaDevolucion = totalDespachados > 0 ? totalDevueltos / totalDespachados : 0;
    const ticketPromedio = totalPedidos > 0 ? facturadoBruto / totalPedidos : 0;

    return NextResponse.json({
      rango: { from: fromStr, to: toStr },
      pedidos: {
        facturados: totalPedidos,
        despachados: totalDespachados,
        entregados: totalEntregados,
        devueltos: totalDevueltos,
        novedades: totalNovedades,
        cancelados: totalCancelados,
      },
      tasas: {
        despachos: tasaDespachos,
        entrega: tasaEntrega,
        devolucion: tasaDevolucion,
      },
      unidades: {
        facturadas: unidadesFacturadas,
        despachadas: unidadesDespachadas,
      },
      finanzas: {
        facturadoBruto,
        entregadoFacturado,
        ticketPromedio,
        pautaGastada,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
