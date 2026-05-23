import { NextResponse, NextRequest } from "next/server";

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

// Rate limit: máximo 1 pedido confirmado por IP en 24h
async function verificarRateLimitIP(ip: string): Promise<{ permitido: boolean; razon?: string }> {
  // Localhost nunca está rate limitado
  if (ip === "127.0.0.1" || ip === "::1" || ip?.startsWith("192.168") || ip?.includes("localhost")) {
    return { permitido: true };
  }

  try {
    const botUrl = process.env.BOT_CHECK_RATE_LIMIT_URL;
    const botSecret = process.env.BOT_CONFIRMADOR_SECRET;

    if (!botUrl || !botSecret) {
      // Si no está configurado, no hace rate limit
      console.warn("[rate-limit] endpoint no configurado, permitiendo");
      return { permitido: true };
    }

    const r = await fetch(botUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-secret": botSecret,
      },
      body: JSON.stringify({ ip }),
    });

    if (!r.ok) {
      console.error("[rate-limit] error consultando bot:", r.status);
      return { permitido: true }; // En caso de error, permitimos (fail open)
    }

    const { permitido, razon } = await r.json();
    return { permitido, razon };
  } catch (err) {
    console.error("[rate-limit] error:", err);
    return { permitido: true }; // Fail open
  }
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  if (!data?.nombre || !data?.telefono || !data?.cantidad) {
    return NextResponse.json({ error: "campos faltantes" }, { status: 400 });
  }

  // Fix #4 — manejo de abandono de formulario (cliente que escribió tel+nombre pero no envió)
  // Se dispara desde el autosave a los 8 segundos. Marca el lead como abandono_form
  // para que el bot pueda hacer follow-up tipo Camila SIN tratarlo como pedido confirmado.
  const esAbandono = data.tipo === "abandono_form";

  // Rate limit solo para pedidos confirmados, no para abandonos
  if (!esAbandono) {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
                     req.headers.get("x-real-ip") ||
                     "unknown";
    const rateCheck = await verificarRateLimitIP(clientIp);

    if (!rateCheck.permitido) {
      console.log(`[rate-limit] bloqueado IP ${clientIp}: ${rateCheck.razon}`);
      return NextResponse.json(
        {
          error: "Ya hiciste un pedido hace menos de 24 horas. Si tienes alguna duda, escríbenos por WhatsApp 👉 wa.me/573227617545",
        },
        { status: 429 }
      );
    }
  }

  const variant = data.variant === "v2" ? "v2" : "v1";
  const PRECIOS = PRECIOS_BY_VARIANT[variant];
  const plan = PRECIOS[String(data.cantidad)] ?? PRECIOS["1"];
  const id = esAbandono
    ? `ABAND-${Date.now().toString(36).toUpperCase()}`
    : `MIT-${Date.now().toString(36).toUpperCase()}`;
  const ts = new Date().toISOString();

  // Log estructurado del pedido — visible en Vercel Logs
  // Cuando armemos el dashboard, basta con leer estos logs (o migrar a DB)
  const pedido = {
    tipo: esAbandono ? "ABANDONO_FORM_MI_TIROIDES" : "PEDIDO_MI_TIROIDES",
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
      const payloadBot = {
        nombre: pedido.cliente.nombre,
        telefono: pedido.cliente.telefono,
        ciudad: pedido.cliente.ciudad,
        departamento: pedido.cliente.departamento,
        direccion: pedido.cliente.direccion,
        referencia: pedido.cliente.referencia,
        cantidad: String(pedido.plan.cantidad),
        variant,
        // Fix #4 — marcamos abandono para que el bot pueda hacer follow-up
        // SIN tratarlo como pedido confirmado. El bot (Camila) puede decidir
        // si manda un mensaje del tipo: "Vi que empezaste a hacer tu pedido,
        // ¿te ayudo a terminarlo?"
        estado: esAbandono ? "abandono_form" : "pedido_confirmado",
        fbclid: data.fbclid || undefined,
        ttclid: data.ttclid || undefined,
        utm_source: data.utm_source || undefined,
        utm_campaign: data.utm_campaign || undefined,
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

  return NextResponse.json({ ok: true, id, estado: esAbandono ? "abandono_form" : "pedido_confirmado" });
}
