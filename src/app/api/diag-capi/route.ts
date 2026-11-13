// DIAGNÓSTICO TEMPORAL (13-nov-2026): ¿el token CAPI de la landing llega a Meta?
// Manda un Purchase con test_event_code (no cuenta para la pauta) y devuelve la respuesta
// de Meta. Protegido con BOT_CONFIRMADOR_SECRET. Se borra después del diagnóstico.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const secret = process.env.BOT_CONFIRMADOR_SECRET;
  if (!secret || req.headers.get("x-secret") !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const pixelId = process.env.META_PIXEL_ID || "722614530760265";
  const token = process.env.META_ACCESS_TOKEN || "";
  const h = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
  const out: Record<string, unknown> = { pixelId, tokenPresente: !!token, tokenLargo: token.length, pixelEnv: !!process.env.META_PIXEL_ID };
  if (token) {
    const dbg = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`).then(r => r.json()).catch(e => ({ error: String(e) }));
    const d = dbg?.data || {};
    out.token = { valido: d.is_valid, tipo: d.type, expira: d.expires_at, app: d.application, error: d.error?.message || dbg?.error?.message };
    const ev = { event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: `DIAG-${Date.now()}`, event_source_url: "https://mi-tiroides.vercel.app/ec", action_source: "website",
      user_data: { ph: [h("593987654321")], country: [h("ec")], client_user_agent: "Mozilla/5.0", client_ip_address: "186.42.18.24" },
      custom_data: { currency: "USD", value: 49.9, content_type: "product", content_ids: ["mi-tiroides-ec"] } };
    const r = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ test_event_code: "DIAG13NOV", data: [ev] }) });
    out.envio = { status: r.status, body: (await r.text()).slice(0, 300) };
  }
  return NextResponse.json(out);
}
