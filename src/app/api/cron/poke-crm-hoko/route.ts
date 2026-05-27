export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Pasarela: este endpoint vive en el landing (Vercel Pro de
// pira1508) y se dispara cada 2 min via vercel.json crons.
// Su única tarea: pingear el endpoint real del CRM-HOKO que
// procesa las plantillas Meta pendientes.
//
// Por qué existe: el plan Hobby de Vercel (donde corre el
// CRM-HOKO en cuenta de Jean Paul) sólo permite 1 cron por día.
// El landing está en plan Pro y permite crons cada 2 min, así
// que delegamos el "tick" desde acá.
//
// Autorización:
//   - Vercel Cron manda Authorization: Bearer ${process.env.CRON_SECRET}
//   - El endpoint destino verifica con su propio CRON_SECRET_CRM_HOKO.
// ============================================================

export async function GET(req: NextRequest) {
  // Vercel Cron envía Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    // También aceptamos ?token=... para invocación manual desde curl
    const token = req.nextUrl.searchParams.get('token')
    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const targetUrl = process.env.CRM_HOKO_CRON_URL
    ?? 'https://crm-hoko.vercel.app/api/cron/send-pending-templates'
  const crmHokoSecret = process.env.CRM_HOKO_CRON_SECRET

  if (!crmHokoSecret) {
    return NextResponse.json(
      { error: 'CRM_HOKO_CRON_SECRET no configurado' },
      { status: 500 },
    )
  }

  try {
    const r = await fetch(targetUrl, {
      method: 'GET',
      headers: { authorization: `Bearer ${crmHokoSecret}` },
    })
    const text = await r.text()
    let body: unknown
    try { body = JSON.parse(text) } catch { body = text }
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      target: targetUrl,
      result: body,
      timestamp: new Date().toISOString(),
    }, { status: r.ok ? 200 : 502 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
