import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const BOT_URL = process.env.BOT_CONFIRMADOR_URL || "https://tiroides-bot.poudman.online/pedido";
const BOT_BASE = BOT_URL.replace(/\/pedido\/?$/, "");
const BOT_SECRET = process.env.BOT_CONFIRMADOR_SECRET || "";

// Fallback local (solo se usa si el bot no responde, ej en dev)
const LOCAL_DIR = process.env.QUIZ_DATA_DIR || "/tmp/mi-tiroides-quiz";
const LOCAL_FILE = path.join(LOCAL_DIR, "events.jsonl");

async function saveLocalFallback(record: Record<string, unknown>) {
  try {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.appendFile(LOCAL_FILE, JSON.stringify(record) + "\n");
  } catch {}
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const record = {
    ts: new Date().toISOString(),
    event: body.event || "unknown",
    score: body.score ?? null,
    segment: body.segment ?? null,
    plan: body.plan ?? null,
    answers: body.answers ?? null,
  };

  try {
    const r = await fetch(`${BOT_BASE}/quiz-event`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        referer: req.headers.get("referer") || "",
        "user-agent": req.headers.get("user-agent") || "",
        "x-forwarded-for": req.headers.get("x-forwarded-for") || "",
      },
      body: JSON.stringify(record),
      // Timeout corto: si el bot no responde no bloqueamos al cliente
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) await saveLocalFallback(record);
  } catch {
    await saveLocalFallback(record);
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  try {
    const r = await fetch(`${BOT_BASE}/admin/quiz-events`, {
      headers: { "x-secret": BOT_SECRET },
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const data = await r.json();
      return NextResponse.json(data);
    }
  } catch {}
  // Fallback: leer del archivo local
  try {
    const raw = await fs.readFile(LOCAL_FILE, "utf-8");
    const events = raw.split("\n").filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    return NextResponse.json({ events, source: "local-fallback" });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
