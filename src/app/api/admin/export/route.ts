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

type Pedido = {
  id: string;
  nombre: string;
  telefono: string;
  departamento?: string;
  ciudad?: string;
  direccion?: string;
  referencia?: string;
  cantidad: number;
  total: number;
  estado: string;
  guia?: string;
  transportadora?: string;
  creado_en: string;
};

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const estadoFiltro = url.searchParams.get("estado") || "confirmado";

  const r = await fetch(`${botBase()}/admin/pedidos`, {
    cache: "no-store",
    headers: { "x-secret": process.env.BOT_CONFIRMADOR_SECRET || "" },
  });
  if (!r.ok) return NextResponse.json({ error: "bot fetch failed" }, { status: 502 });
  const rows = (await r.json()) as Pedido[];

  // "Confirmado pendiente de subir a HOKO" = estado=confirmado y no tiene guia todavía
  // Si el operador filtra por otro estado, lo usamos directo
  // IMPORTANTE: Excluir estado='preliminar' de cualquier export
  const filtrados = rows.filter((p) => {
    if (p.estado === "preliminar") return false;
    if (estadoFiltro === "confirmado") {
      return p.estado === "confirmado" && !p.guia;
    }
    return p.estado === estadoFiltro;
  });

  // Formato: Hoja de cargue HOKO ENVIOS
  // Columnas en español, sin tildes en headers (compatibilidad)
  const headers = [
    "ID Pedido",
    "Nombre Destinatario",
    "Telefono",
    "Departamento",
    "Ciudad",
    "Direccion",
    "Referencia",
    "Cantidad",
    "Valor Contra Entrega",
    "Producto",
    "Observaciones",
  ];

  const lines = [headers.join(",")];
  for (const p of filtrados) {
    const obs = `Pedido MI TIROIDES Avanzado x${p.cantidad} - Pago contra entrega`;
    lines.push([
      csvEscape(p.id),
      csvEscape(p.nombre),
      csvEscape(p.telefono),
      csvEscape(p.departamento),
      csvEscape(p.ciudad),
      csvEscape(p.direccion),
      csvEscape((p.referencia || "").trim()),
      csvEscape(p.cantidad),
      csvEscape(p.total),
      csvEscape("MI TIROIDES Avanzado"),
      csvEscape(obs),
    ].join(","));
  }

  // BOM para que Excel detecte UTF-8 correctamente
  const csv = "﻿" + lines.join("\n");
  const fecha = new Date().toISOString().slice(0, 10);
  const filename = `pedidos-${estadoFiltro}-${fecha}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
