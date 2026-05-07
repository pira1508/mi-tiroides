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
