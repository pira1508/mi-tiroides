// ============================================================================
// ANTI-FRAUDE del checkout de MI TIROIDES
// ============================================================================
// Objetivo: frenar pedidos falsos en lote (competidor con Playwright + direcciones
// reales de Bogotá) SIN meter fricción al comprador legítimo (la conversión es el
// cuello: 3.5%).
//
// FILOSOFÍA: fail-SAFE, nunca fail-open silencioso. Si una defensa NO puede
// evaluar (Redis caído, sin credenciales), el pedido PASA pero queda
// `sospechoso=true` y se loguea con console.error para que se note. Nunca se
// bloquea a un comprador real por un falso positivo.
//
// Capas (de mayor a menor prioridad):
//   1) Rate limiter self-contained (Upstash Redis → fallback Supabase → fail-safe)
//   2) Saneo/validación server-side (nunca confiar en el cliente)
//   3) Honeypot (campo oculto)
//   4) Time-to-submit (< 3s = bot)
//   5) Score de bot (señales suaves → sospechoso, NO bloquea)
//   6) Turnstile invisible (hook listo, DESACTIVADO por defecto)
//
// Todos los umbrales son env con defaults sensatos (ver .env.example / README).
// ============================================================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

// ── Helpers de env ──────────────────────────────────────────────────────────
const numEnv = (k: string, def: number): number => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : def;
};
const boolEnv = (k: string, def = false): boolean => {
  const v = process.env[k];
  if (v == null) return def;
  return v === "true" || v === "1";
};

// ── Umbrales (configurables por env) ────────────────────────────────────────
export const CFG = {
  // Rate limit
  ipConfirmed24h: numEnv("RL_IP_CONFIRMED_24H", 1), // pedidos CONFIRMADOS por IP / 24h
  ipSubmissions1h: numEnv("RL_IP_SUBMISSIONS_1H", 5), // submissions de cualquier tipo / 1h
  phoneConfirmed24h: numEnv("RL_PHONE_CONFIRMED_24H", 1), // confirmados por teléfono / 24h
  ipBurst10min: numEnv("RL_IP_BURST_10MIN", 10), // ráfaga dura / 10 min
  // Anti-bot
  minSubmitMs: numEnv("ANTIFRAUD_MIN_SUBMIT_MS", 3000), // time-to-submit mínimo humano
  scoreSospechoso: numEnv("BOT_SCORE_UMBRAL", 3), // score ≥ esto → sospechoso=true
  // Turnstile (OFF por defecto — nunca en el camino feliz)
  turnstileEnabled: boolEnv("TURNSTILE_ENABLED", false),
  turnstileScoreUmbral: numEnv("TURNSTILE_SCORE_UMBRAL", 6),
  // Límites de longitud
  maxNombre: 80,
  maxDireccion: 200,
  maxReferencia: 200,
  maxCiudad: 60,
  maxDepto: 60,
};

const WHATSAPP_MSG =
  "Ya hiciste un pedido hace poco. Si tienes alguna duda, escríbenos por WhatsApp 👉 wa.me/573237451763";
export const RATE_LIMIT_MESSAGE = WHATSAPP_MSG;

// ── IP helpers ──────────────────────────────────────────────────────────────
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function esIpTest(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.includes("localhost")
  );
}

// ── Saneo de input ──────────────────────────────────────────────────────────
// Caracteres de control ASCII (0x00-0x1F) + DEL (0x7F).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;

export function limpiarTexto(raw: unknown, maxLen: number): string {
  return String(raw ?? "")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

// Teléfono: normalizar (quitar +57, espacios, guiones) y validar móvil colombiano
// (10 dígitos empezando en 3). No rompe el flujo: si no cumple, el caller lo trata
// como preliminar (no confirmado, no Pixel).
export function sanearTelefono(raw: unknown): { normalizado: string; esMovilCO: boolean } {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("57") && d.length === 12) d = d.slice(2); // quitar código país
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  const esMovilCO = /^3\d{9}$/.test(d);
  return { normalizado: d, esMovilCO };
}

export interface InputSaneado {
  nombre: string;
  telefono: string; // normalizado (10 dígitos si es válido)
  esMovilCO: boolean;
  ciudad: string;
  departamento: string;
  direccion: string;
  referencia: string;
  payloadAbsurdo: boolean; // longitudes groseramente fuera de rango → 400
}

export function sanearInput(data: Record<string, unknown>): InputSaneado {
  // Detectar payload absurdo ANTES de truncar (señal de basura/fuzzing)
  const rawNombre = String(data.nombre ?? "");
  const rawDir = String(data.direccion ?? "");
  const rawTel = String(data.telefono ?? "");
  const payloadAbsurdo =
    rawNombre.length > CFG.maxNombre * 3 ||
    rawDir.length > CFG.maxDireccion * 3 ||
    rawTel.length > 40;

  const { normalizado, esMovilCO } = sanearTelefono(data.telefono);
  return {
    nombre: limpiarTexto(data.nombre, CFG.maxNombre),
    telefono: normalizado,
    esMovilCO,
    ciudad: limpiarTexto(data.ciudad, CFG.maxCiudad),
    departamento: limpiarTexto(data.departamento, CFG.maxDepto),
    direccion: limpiarTexto(data.direccion, CFG.maxDireccion),
    referencia: limpiarTexto(data.referencia, CFG.maxReferencia),
    payloadAbsurdo,
  };
}

// ── Honeypot ────────────────────────────────────────────────────────────────
// Campos ocultos que un humano nunca llena. Si llegan con valor → bot.
export function esHoneypot(data: Record<string, unknown>): boolean {
  const trampa = [data.empresa, data.website, data.url].some(
    (v) => typeof v === "string" && v.trim().length > 0
  );
  return trampa;
}

// ── Time-to-submit ──────────────────────────────────────────────────────────
export function tiempoSospechoso(formLoadedAt: unknown): boolean {
  const t = Number(formLoadedAt);
  if (!Number.isFinite(t) || t <= 0) return false; // sin señal ≠ sospechoso
  const delta = Date.now() - t;
  // delta negativo (reloj adelantado del cliente) o < mínimo humano
  return delta >= 0 && delta < CFG.minSubmitMs;
}

// ── Patrón basura en nombre/teléfono ────────────────────────────────────────
export function patronBasura(nombre: string, telefono: string): boolean {
  if (/(.)\1{5,}/.test(nombre)) return true; // "aaaaaa"
  if (/https?:\/\/|www\.|\.com|\d{4,}/.test(nombre)) return true; // urls o números largos en el nombre
  if (nombre.replace(/\s/g, "").length < 2) return true; // vacío/1 letra tras sanear
  if (/^(\d)\1{9}$/.test(telefono)) return true; // 3000000000
  return false;
}

// ── Score de bot (suave: marca sospechoso, NO bloquea) ──────────────────────
const UA_HEADLESS =
  /headless|phantom|puppeteer|playwright|selenium|python-requests|curl\/|wget|node-fetch|axios\/|scrapy|bot|spider|crawler|http-client|go-http/i;

export function calcularScore(
  req: NextRequest,
  señalesPrevias: { honeypot: boolean; tiempoRapido: boolean; telBasura: boolean }
): { score: number; señales: string[] } {
  const señales: string[] = [];
  let score = 0;

  const ua = req.headers.get("user-agent") || "";
  if (!ua) {
    score += 2;
    señales.push("sin_user_agent");
  } else if (UA_HEADLESS.test(ua)) {
    score += 3;
    señales.push("ua_headless");
  }

  // Ningún click/tracking cookie → navegador recién instanciado (Playwright)
  if (!req.headers.get("cookie")) {
    score += 1;
    señales.push("sin_cookies");
  }

  if (señalesPrevias.honeypot) {
    score += 5;
    señales.push("honeypot");
  }
  if (señalesPrevias.tiempoRapido) {
    score += 2;
    señales.push("time_to_submit_bajo");
  }
  if (señalesPrevias.telBasura) {
    score += 2;
    señales.push("patron_basura");
  }

  return { score, señales };
}

// ── RATE LIMITER (Upstash → Supabase → fail-safe) ───────────────────────────
type Tipo = "confirmado" | "preliminar" | "abandono";
export interface RateResult {
  permitido: boolean;
  razon?: string;
  evaluado: boolean; // false → ninguna capa pudo evaluar (fail-safe activo)
}

// Backend Upstash (singleton perezoso)
let _redis: Redis | null = null;
let _redisIntentado = false;
function getRedis(): Redis | null {
  if (_redisIntentado) return _redis;
  _redisIntentado = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

// Cache de instancias Ratelimit por (limit, windowSec)
const _rlCache = new Map<string, Ratelimit>();
function getRatelimit(bucket: string, limit: number, windowSec: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${bucket}:${limit}:${windowSec}`;
  let rl = _rlCache.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      // `${windowSec} s` es un Duration válido de @upstash/ratelimit; el cast al
      // tipo literal evita el widening a `string` de TS.
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s` as `${number} s`),
      prefix: `af:${bucket}`,
      analytics: false,
    });
    _rlCache.set(key, rl);
  }
  return rl;
}

// Fallback Supabase: RPC atómico `af_rate_hit(p_bucket, p_key, p_window_sec, p_limit)`
// → { allowed boolean, hits int }. Ver SQL en README. Usa REST (sin dependencia).
async function consumirSupabase(
  bucket: string,
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean | null> {
  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !svc) return null;
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/rest/v1/rpc/af_rate_hit`, {
      method: "POST",
      headers: {
        apikey: svc,
        authorization: `Bearer ${svc}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_bucket: bucket,
        p_key: key,
        p_window_sec: windowSec,
        p_limit: limit,
      }),
      // no dejar que Supabase lento tumbe el checkout
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) {
      console.error(`[anti-fraud] Supabase rl_hit HTTP ${r.status}`);
      return null;
    }
    const j = await r.json();
    // RPC devuelve boolean `allowed` (o { allowed })
    if (typeof j === "boolean") return j;
    if (j && typeof j.allowed === "boolean") return j.allowed;
    return null;
  } catch (e) {
    console.error("[anti-fraud] Supabase rl_hit error:", (e as Error).message);
    return null;
  }
}

// Consume 1 token del bucket/key. Devuelve:
//   true  = permitido, false = excedido, null = no evaluable (fail-safe)
async function consumir(
  bucket: string,
  key: string,
  limit: number,
  windowSec: number
): Promise<boolean | null> {
  const rl = getRatelimit(bucket, limit, windowSec);
  if (rl) {
    try {
      const { success } = await rl.limit(key);
      return success;
    } catch (e) {
      console.error(`[anti-fraud] Upstash ${bucket} error:`, (e as Error).message);
      // cae al fallback
    }
  }
  return consumirSupabase(bucket, key, limit, windowSec);
}

// Evalúa TODAS las reglas en orden de dureza. Corto-circuita en la primera excedida.
export async function verificarRateLimit(opts: {
  ip: string;
  telefono: string;
  tipo: Tipo;
}): Promise<RateResult> {
  const { ip, telefono, tipo } = opts;

  if (esIpTest(ip)) return { permitido: true, evaluado: true };

  const backendListo =
    !!getRedis() ||
    !!(
      (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  if (!backendListo) {
    // FAIL-SAFE: ninguna infraestructura de rate limit. Dejar pasar pero avisar FUERTE.
    console.error(
      "[anti-fraud] ⚠️ SIN backend de rate limit (falta UPSTASH_* y SUPABASE_*). " +
        "Checkout PASA pero queda sospechoso. Configura Upstash o Supabase YA."
    );
    return { permitido: true, evaluado: false };
  }

  try {
    // 1) Ráfaga global por IP (aplica a TODO request)
    const burst = await consumir("burst", ip, CFG.ipBurst10min, 10 * 60);
    if (burst === false) return { permitido: false, razon: "burst_ip", evaluado: true };

    // 2) Submissions de cualquier tipo por IP / 1h (tapa flood de preliminares)
    const sub = await consumir("sub", ip, CFG.ipSubmissions1h, 60 * 60);
    if (sub === false) return { permitido: false, razon: "submissions_hora_ip", evaluado: true };

    // 3) Solo para CONFIRMADOS: 1 por IP / 24h + 1 por teléfono / 24h
    if (tipo === "confirmado") {
      const ipc = await consumir("ipc", ip, CFG.ipConfirmed24h, 24 * 60 * 60);
      if (ipc === false) return { permitido: false, razon: "ip_24h", evaluado: true };

      if (telefono) {
        const phc = await consumir("phc", telefono, CFG.phoneConfirmed24h, 24 * 60 * 60);
        if (phc === false) return { permitido: false, razon: "tel_24h", evaluado: true };
      }
    }

    // Si algún consumir() devolvió null (backend cayó a mitad), ya se logueó en consumir/Supabase.
    return { permitido: true, evaluado: true };
  } catch (e) {
    console.error("[anti-fraud] rate limit fail-safe (excepción):", (e as Error).message);
    return { permitido: true, evaluado: false };
  }
}

// ── Turnstile (invisible, OFF por defecto) ──────────────────────────────────
// Solo se pide challenge si TURNSTILE_ENABLED=true Y el score ≥ umbral. Nunca en
// el camino feliz. Fail-safe: si no puede verificar, deja pasar.
export function turnstileRequerido(score: number): boolean {
  return CFG.turnstileEnabled && score >= CFG.turnstileScoreUmbral;
}

export async function verificarTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[anti-fraud] TURNSTILE_ENABLED pero falta TURNSTILE_SECRET_KEY → fail-safe (paso)");
    return true;
  }
  if (!token || typeof token !== "string") return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(3000),
    });
    const j = await r.json();
    return j?.success === true;
  } catch (e) {
    console.error("[anti-fraud] Turnstile verify error → fail-safe (paso):", (e as Error).message);
    return true;
  }
}
