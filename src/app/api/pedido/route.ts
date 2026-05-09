import { NextResponse } from "next/server";

const PRECIOS_BY_VARIANT: Record<string, Record<string, { precio: number; frascos: number; label: string }>> = {
  v1: {
    "1": { precio: 89900, frascos: 1, label: "1 Frasco" },
    "2": { precio: 119900, frascos: 2, label: "2 Frascos" },
    "3": { precio: 139900, frascos: 3, label: "3 Frascos" },
  },
  v2: {
    "1": { precio: 89900, frascos: 1, label: "1 Frasco" },
    "2": { precio: 139900, frascos: 2, label: "2 Frascos" },
    "3": { precio: 169900, frascos: 3, label: "3 Frascos" },
  },
};

export async function POST(req: Request) {
  const data = await req.json();

  if (!data?.nombre || !data?.telefono || !data?.cantidad) {
    return NextResponse.json({ error: "campos faltantes" }, { status: 400 });
  }

  const variant = data.variant === "v2" ? "v2" : "v1";
  const PRECIOS = PRECIOS_BY_VARIANT[variant];
  const plan = PRECIOS[String(data.cantidad)] ?? PRECIOS["1"];
  const id = `MIT-${Date.now().toString(36).toUpperCase()}`;
  const ts = new Date().toISOString();

  // Log estructurado del pedido — visible en Vercel Logs
  // Cuando armemos el dashboard, basta con leer estos logs (o migrar a DB)
  const pedido = {
    tipo: "PEDIDO_MI_TIROIDES",
    id,
    timestamp: ts,
    cliente: {
      nombre: String(data.nombre).trim(),
      telefono: String(data.telefono).trim(),
      departamento: data.departamento ?? null,
      ciudad: data.ciudad ?? null,
      direccion: data.direccion ?? null,
      referencia: data.referencia ?? null,
    },
    plan: {
      cantidad: data.cantidad,
      label: plan.label,
      frascos: plan.frascos,
      precio_cop: plan.precio,
    },
    variant,
    fuente: "landing-mi-tiroides",
  };
  // eslint-disable-next-line no-console
  console.log("[PEDIDO]", JSON.stringify(pedido));

  // Si hay bot-confirmador configurado, intenta enviar (no bloquea si falla)
  const url = process.env.BOT_CONFIRMADOR_URL;
  const secret = process.env.BOT_CONFIRMADOR_SECRET;
  if (url && secret) {
    try {
      // Bot espera shape plano: nombre, telefono, cantidad, ciudad, ...
      const payloadBot = {
        nombre: pedido.cliente.nombre,
        telefono: pedido.cliente.telefono,
        ciudad: pedido.cliente.ciudad,
        departamento: pedido.cliente.departamento,
        direccion: pedido.cliente.direccion,
        referencia: pedido.cliente.referencia,
        cantidad: String(pedido.plan.cantidad),
        variant,
        // server-side dedup hint: el bot puede ignorar si <10 min con mismo tel+cantidad
        dedupeKey: `${pedido.cliente.telefono}-${pedido.plan.cantidad}`,
      };
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-secret": secret },
        body: JSON.stringify(payloadBot),
      });
      if (!r.ok) {
        console.warn("[PEDIDO] bot respondió", r.status, await r.text());
      }
    } catch (e) {
      console.warn("[PEDIDO] bot-confirmador falló (ignorado):", e);
    }
  }

  return NextResponse.json({ ok: true, id });
}
