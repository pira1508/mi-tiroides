import { NextResponse, NextRequest } from "next/server";
import { sendPurchaseToAllPixels } from "@/lib/pixels-server";
import { PROVINCIAS_EC, PRECIOS_EC, sanitizarTelefonoEC, esCelularECValido } from "../../ecuador";

// ============================================================
// POST /api/pedido-ec — pedidos de la landing de Ecuador (/ec)
// ============================================================
// Separado de /api/pedido (Colombia) a propósito:
//   - Envía al webhook del CRM `landing-mi-tiroides-ec`, que NO crea guía en
//     Hoko ni activa a Camila (la conversación queda pausada como
//     «Ecuador · pendiente operación»).
//   - Precios en USD. Píxel con currency USD y content_name «MI TIROIDES Ecuador».
// La URL del CRM sale de BOT_CONFIRMADOR_URL cambiando el último tramo, o de
// BOT_CONFIRMADOR_EC_URL si se define.
// ============================================================

const norm = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function urlCRM(): string | null {
  if (process.env.BOT_CONFIRMADOR_EC_URL) return process.env.BOT_CONFIRMADOR_EC_URL;
  const base = process.env.BOT_CONFIRMADOR_URL;
  if (!base || !/landing-mi-tiroides\/?$/.test(base)) return null;
  return base.replace(/landing-mi-tiroides\/?$/, "landing-mi-tiroides-ec");
}

export async function POST(req: NextRequest) {
  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot anti-bot
  if (typeof data.empresa === "string" && data.empresa.trim()) {
    return NextResponse.json({ ok: true, id: `EC-${Date.now().toString(36).toUpperCase()}`, valido: false });
  }

  const esAbandono = data.tipo === "abandono_form";
  const tel = sanitizarTelefonoEC(String(data.telefono ?? ""));
  const nombre = String(data.nombre ?? "").trim();
  if (!esCelularECValido(tel) || nombre.length < 2) {
    return NextResponse.json({ ok: false, error: "datos_invalidos" }, { status: 400 });
  }

  const cantidad = (["1", "2", "3"].includes(String(data.cantidad)) ? String(data.cantidad) : "1") as "1" | "2" | "3";
  const plan = PRECIOS_EC[cantidad];
  const provinciaKey = Object.keys(PROVINCIAS_EC).find((p) => norm(p) === norm(data.provincia));
  const ciudad = String(data.ciudad ?? "").trim();
  const valido = !esAbandono && !!provinciaKey && ciudad.length >= 2;

  const id = `${esAbandono ? "ECAB" : "EC"}-${Date.now().toString(36).toUpperCase()}`;

  const url = urlCRM();
  const secret = process.env.BOT_CONFIRMADOR_SECRET;
  let crmOk = false;
  if (url && secret) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-secret": secret },
        body: JSON.stringify({
          estado: esAbandono ? "abandono_form" : "pedido_confirmado",
          nombre,
          telefono: tel,
          provincia: provinciaKey || data.provincia || null,
          ciudad: ciudad || null,
          direccion: data.direccion ?? null,
          referencia: data.referencia ?? null,
          cantidad,
          total: plan.precio,
          fbclid: data.fbclid || undefined,
          utm_source: data.utm_source || undefined,
          utm_campaign: data.utm_campaign || undefined,
          utm_content: data.utm_content || undefined,
          utm_medium: data.utm_medium || undefined,
          referrer: data.referrer || undefined,
        }),
      });
      crmOk = r.ok;
      if (!r.ok) console.warn("[PEDIDO-EC] CRM respondió", r.status, await r.text());
    } catch (e) {
      console.warn("[PEDIDO-EC] CRM falló:", e);
    }
  } else {
    console.warn("[PEDIDO-EC] sin URL del CRM para Ecuador; pedido solo en logs");
  }
  console.log("[PEDIDO-EC]", JSON.stringify({ id, esAbandono, cantidad, total: plan.precio, provincia: provinciaKey, ciudad, crmOk }));

  if (valido) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || null;
    sendPurchaseToAllPixels({
      eventId: id,
      value: plan.precio,
      currency: "USD",
      telefono: `593${tel}`,
      nombre,
      fbclid: (data.fbclid as string) || null,
      ip,
      userAgent: req.headers.get("user-agent") || null,
      eventSourceUrl: (data.referrer as string) || "https://mi-tiroides.vercel.app/ec",
      contentName: "MI TIROIDES Ecuador",
      contentIds: ["mi-tiroides-ec"],
    });
  }

  return NextResponse.json({ ok: true, id, estado: valido ? "pedido_confirmado" : esAbandono ? "abandono_form" : "preliminar", valido, crmOk });
}
