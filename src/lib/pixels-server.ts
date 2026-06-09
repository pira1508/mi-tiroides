// Server-side pixel events: Meta CAPI + TikTok Events API.
//
// Dispara Purchase desde el servidor con el mismo event_id que el browser
// → Meta y TikTok deduplican automáticamente y atribuyen mejor.
//
// Beneficio: captura conversiones que el browser pixel pierde por
// iOS/adblockers/redirects → CPA real más bajo, lookalikes más limpios.

import crypto from "crypto";

// ────────────────────────────────────────────────────────────
// Tipos comunes
// ────────────────────────────────────────────────────────────

export interface PurchaseEvent {
  eventId: string;          // ID único = ID del pedido (para dedup con browser)
  value: number;            // monto COP
  currency?: string;        // default "COP"
  telefono?: string;        // se hashea antes de mandar (PII)
  email?: string;           // se hashea antes de mandar (PII)
  nombre?: string;          // primer nombre (se hashea)
  fbclid?: string | null;   // Meta click ID
  ttclid?: string | null;   // TikTok click ID
  ip?: string | null;       // IP cliente (para fbc/ttp)
  userAgent?: string | null;
  eventSourceUrl?: string;  // URL donde ocurrió la conversión
}

// SHA-256 lowercase (formato que aceptan ambas APIs para PII)
function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.toLowerCase().trim())
    .digest("hex");
}

// Normalizar teléfono colombiano: 10 dígitos sin +57
function normPhone(tel?: string): string | null {
  if (!tel) return null;
  const d = tel.replace(/\D/g, "");
  if (d.startsWith("57") && d.length === 12) return d.slice(2);
  return d.length >= 10 ? d : null;
}

// ────────────────────────────────────────────────────────────
// META CAPI (Graph API v21.0)
// ────────────────────────────────────────────────────────────
// Endpoint: POST /v21.0/{pixel_id}/events
// Workaround usuario validado 2026-06-01: funciona sin portfolio
// usando un access token de usuario con scope ads_management.

export async function sendMetaCAPIPurchase(ev: PurchaseEvent): Promise<{ ok: boolean; status?: number; body?: string }> {
  const pixelId = process.env.META_PIXEL_ID || "722614530760265";
  const token = process.env.META_ACCESS_TOKEN || "";
  if (!token) {
    console.warn("[CAPI Meta] META_ACCESS_TOKEN no configurado — skip");
    return { ok: false, status: 0, body: "no_token" };
  }

  const phone = normPhone(ev.telefono);
  const userData: Record<string, unknown> = {};
  if (phone) userData.ph = [sha256("57" + phone)]; // Meta espera país+número
  if (ev.email) userData.em = [sha256(ev.email)];
  if (ev.nombre) userData.fn = [sha256(ev.nombre.split(/\s+/)[0])];
  if (ev.fbclid) userData.fbc = `fb.1.${Date.now()}.${ev.fbclid}`;
  if (ev.ip) userData.client_ip_address = ev.ip;
  if (ev.userAgent) userData.client_user_agent = ev.userAgent;
  // country=co + ciudad cuando aplique
  userData.country = [sha256("co")];

  const event = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: ev.eventId,
    event_source_url: ev.eventSourceUrl || "https://mi-tiroides.vercel.app",
    action_source: "website",
    user_data: userData,
    custom_data: {
      currency: ev.currency || "COP",
      value: ev.value,
      content_type: "product",
      content_ids: ["mi-tiroides"],
    },
  };

  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: [event] }),
      }
    );
    const body = await r.text();
    if (!r.ok) {
      console.warn(`[CAPI Meta] HTTP ${r.status}: ${body.slice(0, 250)}`);
    } else {
      console.log(`[CAPI Meta] ✓ Purchase event_id=${ev.eventId} value=${ev.value}`);
    }
    return { ok: r.ok, status: r.status, body: body.slice(0, 300) };
  } catch (e) {
    console.warn("[CAPI Meta] excepción:", (e as Error).message);
    return { ok: false, body: (e as Error).message };
  }
}

// ────────────────────────────────────────────────────────────
// TIKTOK Events API v1.3
// ────────────────────────────────────────────────────────────
// Endpoint: POST https://business-api.tiktok.com/open_api/v1.3/event/track/
// Header: Access-Token

export async function sendTikTokEventPurchase(ev: PurchaseEvent): Promise<{ ok: boolean; status?: number; body?: string }> {
  const pixelCode = process.env.TIKTOK_PIXEL_ID || "D85QV8BC77U8MI6UL30G";
  const token = process.env.TIKTOK_ACCESS_TOKEN || "";
  if (!token) {
    console.warn("[Events TikTok] TIKTOK_ACCESS_TOKEN no configurado — skip");
    return { ok: false, status: 0, body: "no_token" };
  }

  const phone = normPhone(ev.telefono);
  const user: Record<string, unknown> = {};
  if (phone) user.phone_number = sha256("+57" + phone); // TikTok espera +código
  if (ev.email) user.email = sha256(ev.email);
  if (ev.ttclid) user.ttclid = ev.ttclid;
  if (ev.ip) user.ip = ev.ip;
  if (ev.userAgent) user.user_agent = ev.userAgent;
  user.external_id = sha256(ev.eventId); // ID del pedido como external_id

  const payload = {
    event_source: "web",
    event_source_id: pixelCode,
    data: [
      {
        event: "CompletePayment", // TikTok equivalente a Meta Purchase
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.eventId,
        user,
        properties: {
          currency: ev.currency || "COP",
          value: ev.value,
          content_id: "mi-tiroides",
          content_type: "product",
          content_name: "MI TIROIDES",
        },
        page: {
          url: ev.eventSourceUrl || "https://mi-tiroides.vercel.app",
        },
      },
    ],
  };

  try {
    const r = await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Access-Token": token,
      },
      body: JSON.stringify(payload),
    });
    const body = await r.text();
    if (!r.ok) {
      console.warn(`[Events TikTok] HTTP ${r.status}: ${body.slice(0, 250)}`);
    } else {
      // TikTok devuelve 200 incluso con errores en body — chequear code
      try {
        const j = JSON.parse(body);
        if (j.code !== 0) {
          console.warn(`[Events TikTok] code=${j.code} msg=${j.message}`);
          return { ok: false, status: r.status, body: body.slice(0, 300) };
        }
      } catch { /* body no es JSON, ok */ }
      console.log(`[Events TikTok] ✓ CompletePayment event_id=${ev.eventId} value=${ev.value}`);
    }
    return { ok: r.ok, status: r.status, body: body.slice(0, 300) };
  } catch (e) {
    console.warn("[Events TikTok] excepción:", (e as Error).message);
    return { ok: false, body: (e as Error).message };
  }
}

// ────────────────────────────────────────────────────────────
// Wrapper: disparar ambos pixels en paralelo (no bloquea)
// ────────────────────────────────────────────────────────────

export async function sendPurchaseToAllPixels(ev: PurchaseEvent): Promise<void> {
  // Fire and forget: no esperamos respuesta para no bloquear el response al cliente.
  // Los logs quedan en la consola de Vercel para debug.
  Promise.allSettled([
    sendMetaCAPIPurchase(ev),
    sendTikTokEventPurchase(ev),
  ]).catch(() => { /* nunca debería rechazar (allSettled), pero por si acaso */ });
}
