import { NextResponse, NextRequest } from "next/server";
import { DEPARTAMENTOS } from "../../colombia";
import { sendPurchaseToAllPixels } from "@/lib/pixels-server";
import {
  CFG,
  RATE_LIMIT_MESSAGE,
  getClientIp,
  sanearInput,
  esHoneypot,
  tiempoSospechoso,
  patronBasura,
  calcularScore,
  verificarRateLimit,
  turnstileRequerido,
  verificarTurnstile,
} from "@/lib/anti-fraud";

// Normalizar para comparación: lowercase + sin acentos + trim
function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// Validar que ciudad+departamento existan en la lista oficial Colombia
function ciudadValida(ciudad: string | null | undefined, depto: string | null | undefined): boolean {
  if (!ciudad || !depto) return false;
  const c = norm(ciudad);
  const d = norm(depto);
  if (c.length < 2 || d.length < 2) return false;

  const deptoKey = Object.keys(DEPARTAMENTOS).find((k) => norm(k) === d);
  if (!deptoKey) return false;

  const ciudadesOK = DEPARTAMENTOS[deptoKey].some((cd) => norm(cd) === c);
  return ciudadesOK;
}

const PRECIOS_BY_VARIANT: Record<string, Record<string, { precio: number; frascos: number; label: string }>> = {
  v1: {
    "1": { precio: 89900, frascos: 1, label: "1 Frasco" },
    "2": { precio: 119900, frascos: 2, label: "2 Frascos" },
    "3": { precio: 139900, frascos: 3, label: "3 Frascos" },
  },
  // BUG FIX 2026-06-15: el landing v2 muestra $129.900/$159.900 al cliente, pero
  // este API estaba cobrando $139.900/$169.900 (+$10k). Alineados con los precios reales.
  v2: {
    "1": { precio: 89900, frascos: 1, label: "1 Frasco" },
    "2": { precio: 129900, frascos: 2, label: "2 Frascos" },
    "3": { precio: 159900, frascos: 3, label: "3 Frascos" },
  },
};

export async function POST(req: NextRequest) {
  const data = await req.json();

  // ── CAPA 3 · HONEYPOT ─────────────────────────────────────────────────────
  // Campo oculto (empresa/website). Si llega con valor → bot. Respondemos 200
  // FALSO (no creamos pedido, no Pixel, no bot) para no revelar que se detectó.
  if (esHoneypot(data)) {
    console.error(
      `[anti-fraud] honeypot_hit ip=${getClientIp(req)} tel="${String(data.telefono || "").slice(0, 20)}"`
    );
    return NextResponse.json({
      ok: true,
      id: `MIT-${Date.now().toString(36).toUpperCase()}`,
      estado: "ok",
      valido: false, // frontend NO dispara Pixel
    });
  }

  if (!data?.nombre || !data?.telefono || !data?.cantidad) {
    return NextResponse.json({ error: "campos faltantes" }, { status: 400 });
  }

  // ── CAPA 2 · SANEO/VALIDACIÓN server-side (nunca confiar en el cliente) ────
  const s = sanearInput(data);
  if (s.payloadAbsurdo) {
    console.error(`[anti-fraud] payload_absurdo ip=${getClientIp(req)}`);
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  const esAbandono = data.tipo === "abandono_form";

  // VALIDACIÓN CRÍTICA — ciudad+departamento en lista oficial + móvil CO válido.
  // Si NO → preliminar (no pedido real, no Pixel). No rompe el flujo.
  const ciudadOK = ciudadValida(s.ciudad, s.departamento);
  // CONFIRMADO exige: no abandono + ciudad válida + teléfono móvil CO válido.
  const esConfirmado = !esAbandono && ciudadOK && s.esMovilCO;
  const esPreliminar = !esConfirmado;
  const tipo: "confirmado" | "preliminar" | "abandono" = esAbandono
    ? "abandono"
    : esConfirmado
    ? "confirmado"
    : "preliminar";

  if (!esConfirmado && !esAbandono) {
    console.log(
      `[validacion] no-confirmado tel="${s.telefono}" movilCO=${s.esMovilCO} ciudad="${s.ciudad}" depto="${s.departamento}" ciudadOK=${ciudadOK} → preliminar`
    );
  }

  // ── CAPAS 4+5 · TIME-TO-SUBMIT + SCORE DE BOT (suave, NO bloquea) ──────────
  const clientIp = getClientIp(req);
  const tiempoRapido = tiempoSospechoso(data.formLoadedAt);
  const telBasura = patronBasura(s.nombre, s.telefono);
  const { score, señales } = calcularScore(req, {
    honeypot: false, // ya cortocircuitado arriba
    tiempoRapido,
    telBasura,
  });
  let sospechoso = score >= CFG.scoreSospechoso;

  // ── CAPA 6 · TURNSTILE (invisible, OFF por defecto) ───────────────────────
  // Solo si TURNSTILE_ENABLED=true Y score ≥ umbral. Nunca en el camino feliz.
  if (turnstileRequerido(score)) {
    const ok = await verificarTurnstile(data.turnstileToken, clientIp);
    if (!ok) {
      return NextResponse.json(
        { error: "verificación requerida", challenge: "turnstile" },
        { status: 403 }
      );
    }
  }

  // ── CAPA 1 · RATE LIMITER (Upstash → Supabase → fail-safe) ────────────────
  const rate = await verificarRateLimit({ ip: clientIp, telefono: s.telefono, tipo });
  if (!rate.permitido) {
    console.log(`[rate-limit] bloqueado ip=${clientIp} tel=${s.telefono} tipo=${tipo} razon=${rate.razon}`);
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  // Fail-SAFE: si ninguna capa pudo evaluar, pasa PERO queda sospechoso (ya se
  // logueó console.error en el módulo).
  if (!rate.evaluado) {
    sospechoso = true;
    señales.push("rate_limit_no_evaluado");
  }

  const variant = data.variant === "v2" ? "v2" : "v1";
  const PRECIOS = PRECIOS_BY_VARIANT[variant];
  const plan = PRECIOS[String(data.cantidad)] ?? PRECIOS["1"];
  const idPrefix = esAbandono ? "ABAND" : !esConfirmado ? "PRELIM" : "MIT";
  const id = `${idPrefix}-${Date.now().toString(36).toUpperCase()}`;
  const ts = new Date().toISOString();

  const pedido = {
    tipo: esAbandono
      ? "ABANDONO_FORM_MI_TIROIDES"
      : !esConfirmado
      ? "PRELIMINAR_MI_TIROIDES"
      : "PEDIDO_MI_TIROIDES",
    id,
    timestamp: ts,
    sospechoso,
    señales,
    score,
    cliente: {
      nombre: s.nombre,
      telefono: s.telefono,
      departamento: s.departamento || null,
      ciudad: s.ciudad || null,
      direccion: s.direccion || null,
      referencia: s.referencia || null,
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
  if (sospechoso) {
    console.error(`[anti-fraud] sospechoso id=${id} score=${score} señales=${señales.join(",")} ip=${clientIp}`);
  }

  // Bot-confirmador (no bloquea si falla). Se le pasa `sospechoso` para que
  // Camila lo trate con pinzas (no auto-despacho).
  const url = process.env.BOT_CONFIRMADOR_URL;
  const secret = process.env.BOT_CONFIRMADOR_SECRET;
  if (url && secret) {
    try {
      const payloadBot = {
        nombre: pedido.cliente.nombre,
        telefono: pedido.cliente.telefono,
        ciudad: pedido.cliente.ciudad,
        departamento: pedido.cliente.departamento,
        direccion: pedido.cliente.direccion,
        referencia: pedido.cliente.referencia,
        cantidad: String(pedido.plan.cantidad),
        variant,
        estado: esAbandono
          ? "abandono_form"
          : !esConfirmado
          ? "preliminar_sin_ciudad"
          : "pedido_confirmado",
        sospechoso, // ← NUEVO: bot/Camila no auto-despacha si true
        señales_fraude: sospechoso ? señales : undefined,
        fbclid: data.fbclid || undefined,
        ttclid: data.ttclid || undefined,
        utm_source: data.utm_source || undefined,
        utm_campaign: data.utm_campaign || undefined,
        utm_content: data.utm_content || undefined,
        utm_medium: data.utm_medium || undefined,
        referrer: data.referrer || undefined,
        dedupeKey: `${pedido.cliente.telefono}-${pedido.plan.cantidad}`,
      };
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-secret": secret },
        body: JSON.stringify(payloadBot),
      });
      if (!r.ok) {
        console.warn(`[${esAbandono ? "ABANDONO" : "PEDIDO"}] bot respondió`, r.status, await r.text());
      }
    } catch (e) {
      console.warn("[PEDIDO] bot-confirmador falló (ignorado):", e);
    }
  }

  // Estado de respuesta: SOLO "pedido_confirmado" dispara Purchase (no romper).
  const estadoFinal = esAbandono
    ? "abandono_form"
    : !esConfirmado
    ? "preliminar_sin_ciudad"
    : "pedido_confirmado";

  // SERVER-SIDE PIXELS — Meta CAPI + TikTok. Solo pedido_confirmado real.
  // Fire-and-forget. El rate limiter (1 confirmado/IP y /tel por 24h) acota la
  // exposición de Pixel a bots; los sospechosos los frena el bot-confirmador.
  if (estadoFinal === "pedido_confirmado") {
    const ip = clientIp === "unknown" ? null : clientIp;
    const userAgent = req.headers.get("user-agent") || null;

    sendPurchaseToAllPixels({
      eventId: id,
      value: plan.precio,
      currency: "COP",
      telefono: pedido.cliente.telefono,
      nombre: pedido.cliente.nombre,
      fbclid: data.fbclid || null,
      ttclid: data.ttclid || null,
      ip,
      userAgent,
      eventSourceUrl: data.referrer || "https://mi-tiroides.vercel.app",
    });
  }

  return NextResponse.json({
    ok: true,
    id,
    estado: estadoFinal,
    valido: esConfirmado, // ← frontend chequea esto para Pixel
  });
}
