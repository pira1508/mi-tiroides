# Landing HashiCo Tiroide+ (Next.js)

Landing de un solo producto. Captura pedido contra entrega y lo reenvía al `bot-confirmador`.

## Correr local

```
cp .env.example .env.local
# editar BOT_CONFIRMADOR_URL y BOT_CONFIRMADOR_SECRET
npm install
npm run dev   # http://localhost:3000
```

El `bot-confirmador` debe estar corriendo en paralelo (puerto 3001 por defecto).

## Deploy

```
vercel deploy
```

Setear variables `BOT_CONFIRMADOR_URL` y `BOT_CONFIRMADOR_SECRET` en el dashboard de Vercel.

## Flujo

1. Cliente llena el form de la home (`/`)
2. POST a `/api/pedido` (server-side)
3. Reenvía al `bot-confirmador` con `x-secret` header
4. El bot guarda + envía WhatsApp de confirmación

## Anti-fraude del checkout (`/api/pedido`)

Frena pedidos falsos en lote (bots / competidor con Playwright) **sin agregar fricción al comprador legítimo** (cero CAPTCHA visible en el camino feliz). Lógica en `src/lib/anti-fraud.ts`. Filosofía **fail-SAFE**: si una defensa no puede evaluar (Redis caído, sin creds), el pedido **pasa** pero queda `sospechoso=true` y se loguea con `console.error` (nunca se bloquea a un comprador real por un falso positivo).

### Capas (mayor → menor prioridad)
1. **Rate limiter** (Upstash Redis → fallback Supabase → fail-safe). Reglas por env:
   - `RL_IP_CONFIRMED_24H` (1): pedidos **confirmados** por IP / 24h → el 2º da **429**.
   - `RL_PHONE_CONFIRMED_24H` (1): confirmados por teléfono / 24h.
   - `RL_IP_SUBMISSIONS_1H` (5): submissions de **cualquier** tipo por IP / 1h → tapa el flood de preliminares.
   - `RL_IP_BURST_10MIN` (10): ráfaga dura por IP / 10 min → 429.
2. **Saneo server-side**: teléfono normalizado + móvil CO válido (10 díg. empezando en 3; si no → preliminar, sin Pixel); trim + longitudes máx (nombre 80 / dirección 200 / referencia 200) + quita caracteres de control; payload absurdo → 400.
3. **Honeypot**: campo oculto `empresa` en el form. Si llega con valor → **200 falso** (0 pedidos, 0 Pixel, log `honeypot_hit`).
4. **Time-to-submit** (`ANTIFRAUD_MIN_SUBMIT_MS`, 3000ms): submit < 3s desde carga → suma al score.
5. **Score de bot** (`BOT_SCORE_UMBRAL`, 3): sin UA / UA headless / sin cookies / honeypot / submit rápido / patrón basura. Score ≥ umbral → `sospechoso=true` (NO bloquea; el bot-confirmador/Camila no auto-despacha).
6. **Turnstile invisible** (`TURNSTILE_ENABLED=false` por defecto): challenge SOLO si `score ≥ TURNSTILE_SCORE_UMBRAL`. Nunca en el camino feliz.

### Cómo subir/bajar la dureza
- **Más estricto**: baja `RL_IP_SUBMISSIONS_1H` (p.ej. 3), sube `ANTIFRAUD_MIN_SUBMIT_MS` (5000), baja `BOT_SCORE_UMBRAL` (2). Activa Turnstile si escala el ataque.
- **Más laxo** (si hay falsos positivos): sube `RL_IP_SUBMISSIONS_1H`, sube `BOT_SCORE_UMBRAL`.
- Localhost / IPs de test (127.0.0.1, ::1, 192.168.*, 10.*) **nunca** se rate-limitan.

### Backend del rate limiter
- **Preferido — Upstash Redis** (free tier, sliding window atómico, ideal serverless): setear `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- **Fallback — Supabase** (si no hay Upstash): setear `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` y crear el RPC:

```sql
create table if not exists rate_limit_hits (
  id bigserial primary key,
  bucket text not null,
  key text not null,
  hit_at timestamptz not null default now()
);
create index if not exists idx_rlh_bucket_key_time on rate_limit_hits (bucket, key, hit_at);

-- Devuelve TRUE si el hit está permitido (dentro del límite en la ventana), FALSE si excede.
create or replace function af_rate_hit(p_bucket text, p_key text, p_window_sec int, p_limit int)
returns boolean language plpgsql as $$
declare v_count int;
begin
  delete from rate_limit_hits
   where bucket = p_bucket and key = p_key and hit_at < now() - make_interval(secs => p_window_sec);
  select count(*) into v_count
    from rate_limit_hits
   where bucket = p_bucket and key = p_key and hit_at >= now() - make_interval(secs => p_window_sec);
  if v_count >= p_limit then
    return false;
  end if;
  insert into rate_limit_hits (bucket, key) values (p_bucket, p_key);
  return true;
end $$;
```

- **Ninguno configurado** → fail-SAFE: el pedido pasa, `sospechoso=true`, y sale un `console.error` gritando que falta el backend. **Configura al menos uno en producción.**

### Verificar sin desplegar
```
npm run dev                       # levanta el landing en :3000
node scripts/attack-test.mjs      # 12 POST desde la misma IP → esperado: 1 confirmado, resto 429/preliminar
```
