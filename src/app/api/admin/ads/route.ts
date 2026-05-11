import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

// Una campaña de Meta con su embudo completo
type Campaign = {
  id: string;
  name: string;
  variant: "A" | "B" | "—"; // CBO MI TIROIDES → A, CBO MI TIROIDES #2 → B
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
  landingPageViews: number;
  initiateCheckout: number;
  leads: number;
  purchases: number;
  value: number;
  roas: number;
  cpa: number;
};

function clasificarVariant(name: string): "A" | "B" | "—" {
  const n = name.toLowerCase();
  // "CBO MI TIROIDES #2 nueva oferta" → B (oferta nueva)
  if (/#2|nueva oferta|v2/.test(n)) return "B";
  // "CBO MI TIROIDES" original → A
  if (/cbo.*tiroides/.test(n)) return "A";
  return "—";
}

type MetaCampaign = { id: string; name: string };
type MetaAction = { action_type: string; value: string };
type MetaInsightRow = {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
};

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const META_TOKEN = process.env.META_ACCESS_TOKEN || "";
  const ACT_ID = process.env.META_AD_ACCOUNT_ID || "act_598280937285029";
  if (!META_TOKEN) {
    return NextResponse.json({ error: "missing META_ACCESS_TOKEN env var" }, { status: 500 });
  }

  // 1. Listar campañas de TIROIDES
  const campaignsUrl = new URL(`https://graph.facebook.com/v21.0/${ACT_ID}/campaigns`);
  campaignsUrl.searchParams.set("fields", "name,id");
  campaignsUrl.searchParams.set("limit", "100");
  campaignsUrl.searchParams.set("access_token", META_TOKEN);

  const cr = await fetch(campaignsUrl.toString(), { cache: "no-store" });
  if (!cr.ok) {
    return NextResponse.json({ error: "meta campaigns fetch failed", status: cr.status }, { status: 502 });
  }
  const campaignsData = await cr.json();
  const tiroidesCamps: MetaCampaign[] = ((campaignsData.data ?? []) as MetaCampaign[])
    .filter((c) => /tiroides/i.test(c.name || ""));

  if (tiroidesCamps.length === 0) {
    return NextResponse.json({
      spend: 0, roas: 0, cpa: 0, purchases: 0, ctr: 0, cpc: 0, campaigns: [],
      note: "Sin campañas TIROIDES",
    });
  }

  // 2. Para cada campaña, fetch insights con embudo completo
  const campaigns: Campaign[] = await Promise.all(tiroidesCamps.map(async (c): Promise<Campaign> => {
    const u = new URL(`https://graph.facebook.com/v21.0/${c.id}/insights`);
    u.searchParams.set("fields", "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values");
    u.searchParams.set("date_preset", "maximum");
    u.searchParams.set("access_token", META_TOKEN);

    const r = await fetch(u.toString(), { cache: "no-store" });
    let spend = 0, impressions = 0, reach = 0, clicks = 0, ctr = 0, cpc = 0, cpm = 0, frequency = 0;
    let lpv = 0, ic = 0, leads = 0, purchases = 0, value = 0;

    if (r.ok) {
      const data = await r.json();
      for (const row of (data.data ?? []) as MetaInsightRow[]) {
        spend += parseFloat(row.spend ?? "0");
        impressions += parseInt(row.impressions ?? "0");
        reach += parseInt(row.reach ?? "0");
        clicks += parseInt(row.clicks ?? "0");
        ctr = parseFloat(row.ctr ?? "0");
        cpc = parseFloat(row.cpc ?? "0");
        cpm = parseFloat(row.cpm ?? "0");
        frequency = parseFloat(row.frequency ?? "0");
        for (const a of row.actions ?? []) {
          if (a.action_type === "landing_page_view") lpv += parseInt(a.value || "0");
          if (a.action_type === "initiate_checkout") ic += parseInt(a.value || "0");
          if (a.action_type === "lead") leads += parseInt(a.value || "0");
          if (a.action_type === "purchase") purchases += parseInt(a.value || "0");
        }
        for (const av of row.action_values ?? []) {
          if (av.action_type === "purchase") value += parseFloat(av.value || "0");
        }
      }
    }

    return {
      id: c.id,
      name: c.name,
      variant: clasificarVariant(c.name),
      spend: Math.round(spend),
      impressions,
      reach,
      clicks,
      ctr: Number(ctr.toFixed(2)),
      cpc: Math.round(cpc),
      cpm: Math.round(cpm),
      frequency: Number(frequency.toFixed(2)),
      landingPageViews: lpv,
      initiateCheckout: ic,
      leads,
      purchases,
      value: Math.round(value),
      roas: spend > 0 ? Number((value / spend).toFixed(2)) : 0,
      cpa: purchases > 0 ? Math.round(spend / purchases) : 0,
    };
  }));

  // 3. Agregados totales
  const totalSpend = campaigns.reduce((a, c) => a + c.spend, 0);
  const totalImpr = campaigns.reduce((a, c) => a + c.impressions, 0);
  const totalClicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const totalLPV = campaigns.reduce((a, c) => a + c.landingPageViews, 0);
  const totalIC = campaigns.reduce((a, c) => a + c.initiateCheckout, 0);
  const totalPurchases = campaigns.reduce((a, c) => a + c.purchases, 0);
  const totalValue = campaigns.reduce((a, c) => a + c.value, 0);

  return NextResponse.json({
    // Resumen agregado (para los KPIs de arriba)
    spend: totalSpend,
    impressions: totalImpr,
    clicks: totalClicks,
    purchases: totalPurchases,
    value: totalValue,
    roas: totalSpend > 0 ? Number((totalValue / totalSpend).toFixed(2)) : 0,
    cpa: totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0,
    ctr: totalImpr > 0 ? Number(((totalClicks / totalImpr) * 100).toFixed(2)) : 0,
    cpc: totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0,
    landingPageViews: totalLPV,
    initiateCheckout: totalIC,
    // Lista completa de campañas (para tabla de embudo)
    campaigns,
  });
}
