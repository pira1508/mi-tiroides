import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

type Campaign = {
  id: string;
  name: string;
  variant: "A" | "B" | "—";
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
  frascos: number; // Frascos vendidos estimados (purchases * frascos por AOV)
};

function clasificarVariant(name: string): "A" | "B" | "—" {
  const n = name.toLowerCase();
  if (/#2|nueva oferta|v2/.test(n)) return "B";
  if (/cbo.*tiroides/.test(n)) return "A";
  return "—";
}

// Estima cuántos frascos representa un AOV dado.
// Precios: 1f=$89.900, 2f=$119.900, 3fA=$139.900, 3fB=$169.900
function frascosPorAOV(aov: number): number {
  if (aov <= 0) return 1;
  if (aov < 105000) return 1;
  if (aov < 130000) return 2;
  return 3;
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

const VALID_PRESETS = new Set([
  "today", "yesterday", "this_week_mon_today", "last_week_mon_sun",
  "last_7d", "last_14d", "last_30d", "last_90d",
  "this_month", "last_month", "maximum",
]);

export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const META_TOKEN = process.env.META_ACCESS_TOKEN || "";
  const ACT_ID = process.env.META_AD_ACCOUNT_ID || "act_598280937285029";
  if (!META_TOKEN) {
    return NextResponse.json({ error: "missing META_ACCESS_TOKEN env var" }, { status: 500 });
  }

  // Parsear parámetros de fecha
  const url = new URL(req.url);
  const preset = url.searchParams.get("preset") || "last_30d";
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");

  // 1. Listar campañas TIROIDES
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
    .filter((c) => /tiroides|image\s*12/i.test(c.name || ""));

  if (tiroidesCamps.length === 0) {
    return NextResponse.json({
      spend: 0, roas: 0, cpa: 0, purchases: 0, ctr: 0, cpc: 0, frascos: 0, campaigns: [],
      note: "Sin campañas TIROIDES",
    });
  }

  // 2. Insights por campaña con rango de fechas
  const campaigns: Campaign[] = await Promise.all(tiroidesCamps.map(async (c): Promise<Campaign> => {
    const u = new URL(`https://graph.facebook.com/v21.0/${c.id}/insights`);
    u.searchParams.set("fields", "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values");
    if (since && until) {
      u.searchParams.set("time_range", JSON.stringify({ since, until }));
    } else {
      const usePreset = VALID_PRESETS.has(preset) ? preset : "last_30d";
      u.searchParams.set("date_preset", usePreset);
    }
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
          if (a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase") {
            purchases += parseInt(a.value || "0");
          }
        }
        for (const av of row.action_values ?? []) {
          if (av.action_type === "purchase" || av.action_type === "offsite_conversion.fb_pixel_purchase") {
            value += parseFloat(av.value || "0");
          }
        }
      }
    }

    // Estimar frascos vendidos: aov → frascos por compra × purchases
    const aov = purchases > 0 ? value / purchases : 0;
    const frascos = purchases * frascosPorAOV(aov);

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
      frascos,
    };
  }));

  const totalSpend = campaigns.reduce((a, c) => a + c.spend, 0);
  const totalImpr = campaigns.reduce((a, c) => a + c.impressions, 0);
  const totalClicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const totalLPV = campaigns.reduce((a, c) => a + c.landingPageViews, 0);
  const totalIC = campaigns.reduce((a, c) => a + c.initiateCheckout, 0);
  const totalPurchases = campaigns.reduce((a, c) => a + c.purchases, 0);
  const totalValue = campaigns.reduce((a, c) => a + c.value, 0);
  const totalFrascos = campaigns.reduce((a, c) => a + c.frascos, 0);

  return NextResponse.json({
    spend: totalSpend,
    impressions: totalImpr,
    clicks: totalClicks,
    purchases: totalPurchases,
    frascos: totalFrascos,
    value: totalValue,
    roas: totalSpend > 0 ? Number((totalValue / totalSpend).toFixed(2)) : 0,
    cpa: totalPurchases > 0 ? Math.round(totalSpend / totalPurchases) : 0,
    ctr: totalImpr > 0 ? Number(((totalClicks / totalImpr) * 100).toFixed(2)) : 0,
    cpc: totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0,
    landingPageViews: totalLPV,
    initiateCheckout: totalIC,
    campaigns,
    rango: since && until ? `${since} → ${until}` : preset,
  });
}
