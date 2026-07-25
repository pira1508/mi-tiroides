// ============================================================================
// attack-test.mjs — simula el ataque en lote contra /api/pedido para verificar
// las defensas anti-fraude SIN desplegar.
//
// Uso:
//   npm run dev                 # levanta el landing en :3000 (con Upstash/Supabase en .env.local)
//   node scripts/attack-test.mjs
//   TARGET=https://mi-tiroides.vercel.app node scripts/attack-test.mjs   # contra prod (cuidado)
//
// Manda 12 POST con ciudad válida (Bogotá) + móvil CO válido desde la MISMA IP
// simulada (header x-forwarded-for con una IP pública falsa, para que NO cuente
// como IP de test/localhost). Esperado con el rate limiter activo:
//   → 1 pedido_confirmado, el resto 429.
// Además prueba: honeypot (200 falso, 0 pedidos) y submit ultra-rápido (sospechoso).
//
// OJO: si el rate limiter no tiene backend (sin UPSTASH_* ni SUPABASE_*), la
// política fail-SAFE deja pasar todo (marcado sospechoso). El script lo detecta
// y te avisa que configures Upstash/Supabase.
// ============================================================================

const TARGET = process.env.TARGET || "http://localhost:3000";
const URL = `${TARGET.replace(/\/$/, "")}/api/pedido`;
const FAKE_IP = process.env.FAKE_IP || "203.0.113.77"; // IP pública de test (TEST-NET-3, no es tuya)
const N = Number(process.env.N || 12);

function base(i) {
  return {
    nombre: "Juan Perez Prueba",
    // móvil CO válido, distinto en cada request (para no chocar solo por teléfono)
    telefono: `30012345${String(10 + i).slice(-2)}`,
    departamento: "Cundinamarca",
    ciudad: "Bogotá",
    direccion: "Calle 123 # 45-67 apto 890",
    referencia: "Barrio Centro, cerca del parque",
    cantidad: "1",
    variant: "v1",
    // time-to-submit humano (para aislar el rate limit, no el score)
    formLoadedAt: Date.now() - 20000,
  };
}

async function post(body, extraHeaders = {}) {
  const r = await fetch(URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": FAKE_IP,
      "user-agent": "Mozilla/5.0 (attack-test humano-simulado)",
      cookie: "ok=1",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, j };
}

function clasif(status, j) {
  if (status === 429) return "429_BLOQUEADO";
  if (status === 400) return "400_INVALIDO";
  if (status === 403) return "403_CHALLENGE";
  if (status === 200 && j?.valido === true && j?.estado === "pedido_confirmado") return "CONFIRMADO";
  if (status === 200 && j?.valido === false) return "PRELIMINAR/FALSO";
  return `OTRO_${status}`;
}

async function main() {
  console.log(`\n🎯 Objetivo: ${URL}`);
  console.log(`🌐 IP simulada (misma para todos): ${FAKE_IP}`);
  console.log(`📤 Enviando ${N} pedidos "válidos" en ráfaga…\n`);

  const conteo = {};
  for (let i = 0; i < N; i++) {
    const { status, j } = await post(base(i));
    const c = clasif(status, j);
    conteo[c] = (conteo[c] || 0) + 1;
    console.log(`  #${String(i + 1).padStart(2)}  ${status}  ${c}  ${j?.id || ""}`);
  }

  console.log("\n── Honeypot (campo 'empresa' lleno) ──");
  const hp = await post({ ...base(99), empresa: "bot-llenó-esto" });
  console.log(`  status ${hp.status} · estado=${hp.j?.estado} · valido=${hp.j?.valido}  → ${clasif(hp.status, hp.j)}`);

  console.log("\n── Submit ultra-rápido (formLoadedAt = ahora) ──");
  const fast = await post({ ...base(98), telefono: "3009999998", formLoadedAt: Date.now() });
  console.log(`  status ${fast.status} · estado=${fast.j?.estado}  (debería pasar pero marcado sospechoso en el log del server)`);

  console.log("\n════════ RESUMEN ════════");
  console.log(conteo);
  const confirmados = conteo["CONFIRMADO"] || 0;
  const bloqueados = conteo["429_BLOQUEADO"] || 0;

  console.log(`\nConfirmados: ${confirmados}  ·  Bloqueados(429): ${bloqueados}  de ${N}`);
  if (confirmados === 1 && bloqueados >= N - 2) {
    console.log("✅ PASA: 1 confirmado, el resto bloqueado. Rate limiter funcionando.");
  } else if (confirmados >= N - 1) {
    console.log(
      "⚠️  Casi todos pasaron. Probable causa: el rate limiter NO tiene backend\n" +
      "   (faltan UPSTASH_REDIS_REST_URL/_TOKEN o SUPABASE_URL/_SERVICE_ROLE_KEY en .env.local).\n" +
      "   Está en fail-SAFE (pasa + sospechoso). Configura Upstash/Supabase y reintenta.\n" +
      "   Revisá los logs del `npm run dev`: deben GRITAR el console.error del backend faltante."
    );
  } else {
    console.log("🔎 Resultado intermedio — revisá el detalle arriba y los logs del server.");
  }
  console.log(`Honeypot: ${hp.j?.valido === false ? "✅ 200 falso, sin Pixel" : "❌ revisar"}`);
}

main().catch((e) => {
  console.error("\n❌ Error corriendo el test (¿está `npm run dev` levantado?):", e.message);
  process.exit(1);
});
