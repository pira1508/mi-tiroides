import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const META_TOKEN = process.env.META_ACCESS_TOKEN || "";
  const ACT_ID = process.env.META_AD_ACCOUNT_ID || "act_598280937285029";
  if (!META_TOKEN) {
    return NextResponse.json({ error: "missing META_ACCESS_TOKEN env var" }, { status: 500 });
  }

  // Solo campañas que contengan TIROIDES
  const campaignsUrl = new URL(`https://graph.facebook.com/v21.0/${ACT_ID}/campaigns`);
  campaignsUrl.searchParams.set("fields", "name,id");
  campaignsUrl.searchParams.set("limit", "100");
  campaignsUrl.searchParams.set("access_token", META_TOKEN);

  const cr = await fetch(campaignsUrl.toString(), { cache: "no-store" });
  if (!cr.ok) {
    return NextResponse.json({ error: "meta campaigns fetch failed", status: cr.status }, { status: 502 });
  }
  const campaignsData = await cr.json();
  const tiroidesIds: string[] = (campaignsData.data || [])
    .filter((c: any) => /tiroides/i.test(c.name || ""))
    .map((c: any) => c.id);

  if (tiroidesIds.length === 0) {
    return NextResponse.json({ spend: 0, roas: 0, cpa: 0, purchases: 0, ctr: 0, cpc: 0, note: "Sin campañas TIROIDES" });
  }

  // Insights de cada campaña, agregado
  let totalSpend = 0;
  let totalImpr = 0;
  let totalClicks = 0;
  let totalPurchases = 0;
  let totalValue = 0;

  await Promise.all(tiroidesIds.map(async (cid) => {
    const u = new URL(`https://graph.facebook.com/v21.0/${cid}/insights`);
    u.searchParams.set("fields", "spend,impressions,clicks,actions,action_values");
    u.searchParams.set("date_preset", "maximum");
    u.searchParams.set("access_token", META_TOKEN);
    const r = await fetch(u.toString(), { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    for (const row of data.data || []) {
      totalSpend += parseFloat(row.spend || "0");
      totalImpr += parseInt(row.impressions || "0");
      totalClicks += parseInt(row.clicks || "0");
      for (const a of row.actions || []) {
        if (a.action_type === "purchase") totalPurchases += parseInt(a.value || "0");
      }
      for (const av of row.action_values || []) {
        if (av.action_type === "purchase") totalValue += parseFloat(av.value || "0");
      }
    }
  }));

  const roas = totalSpend > 0 ? totalValue / totalSpend : 0;
  const cpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;
  const ctr = totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  return NextResponse.json({
    spend: Math.round(totalSpend),
    impressions: totalImpr,
    clicks: totalClicks,
    purchases: totalPurchases,
    value: Math.round(totalValue),
    roas: Number(roas.toFixed(2)),
    cpa: Math.round(cpa),
    ctr: Number(ctr.toFixed(2)),
    cpc: Math.round(cpc),
    campaigns: tiroidesIds.length,
  });
}
