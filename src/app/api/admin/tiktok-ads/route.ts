import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth() {
  const c = await cookies();
  return c.get("admin_session")?.value === "ok";
}

type TikTokCampaign = {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  conversions: number;
  cpa: number;
  videoViews: number;
};

const VALID_PRESETS = new Set([
  "today", "yesterday", "last_7d", "last_14d", "last_30d", "last_90d",
  "this_month", "last_month", "maximum",
]);

// Bogotá YYYY-MM-DD
function presetARango(preset: string): { since: string; until: string } {
  const hoy = new Date();
  const bogotaOffsetMin = -5 * 60;
  const ahora = new Date(hoy.getTime() + (hoy.getTimezoneOffset() - bogotaOffsetMin) * 60_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const restar = (n: number) => { const x = new Date(ahora); x.setDate(x.getDate() - n); return x; };
  switch (preset) {
    case "today": return { since: fmt(ahora), until: fmt(ahora) };
    case "yesterday": { const y = restar(1); return { since: fmt(y), until: fmt(y) }; }
    case "last_7d": return { since: fmt(restar(7)), until: fmt(restar(1)) };
    case "last_14d": return { since: fmt(restar(14)), until: fmt(restar(1)) };
    case "last_30d": return { since: fmt(restar(30)), until: fmt(restar(1)) };
    case "last_90d": return { since: fmt(restar(90)), until: fmt(restar(1)) };
    case "this_month": {
      const start = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      return { since: fmt(start), until: fmt(ahora) };
    }
    case "last_month": {
      const start = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const end = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
      return { since: fmt(start), until: fmt(end) };
    }
    case "maximum": return { since: "2026-01-01", until: fmt(ahora) };
    default: return { since: fmt(restar(30)), until: fmt(restar(1)) };
  }
}

type TikTokCampaignListItem = { campaign_id: string; campaign_name: string; operation_status?: string };
type TikTokInsightRow = {
  dimensions?: { campaign_id?: string };
  metrics?: Record<string, string>;
};

export async function GET(req: Request) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const TOKEN = process.env.TIKTOK_BUSINESS_TOKEN || "";
  const ADV_ID = process.env.TIKTOK_ADVERTISER_ID || "";

  if (!TOKEN || !ADV_ID) {
    // Sin credenciales: respuesta vacía con guía
    return NextResponse.json({
      configured: false,
      message: "Falta configurar TikTok Business API. Necesitas TIKTOK_BUSINESS_TOKEN y TIKTOK_ADVERTISER_ID en .env",
      spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, cpa: 0,
      campaigns: [],
    });
  }

  const url = new URL(req.url);
  const preset = url.searchParams.get("preset") || "last_30d";
  const sinceParam = url.searchParams.get("since");
  const untilParam = url.searchParams.get("until");
  const range = (sinceParam && untilParam)
    ? { since: sinceParam, until: untilParam }
    : presetARango(VALID_PRESETS.has(preset) ? preset : "last_30d");

  const BASE = "https://business-api.tiktok.com/open_api/v1.3";
  const headers = { "Access-Token": TOKEN, "Content-Type": "application/json" };

  // 1. Listar campañas que mencionan "tiroides"
  const campaignsUrl = new URL(`${BASE}/campaign/get/`);
  campaignsUrl.searchParams.set("advertiser_id", ADV_ID);
  campaignsUrl.searchParams.set("page_size", "100");

  const cr = await fetch(campaignsUrl.toString(), { headers, cache: "no-store" });
  if (!cr.ok) {
    return NextResponse.json({ error: "tiktok campaigns fetch failed", status: cr.status }, { status: 502 });
  }
  const cd = await cr.json();
  if (cd.code !== 0) {
    return NextResponse.json({ error: "tiktok api error", detail: cd.message }, { status: 502 });
  }
  const allCamps: TikTokCampaignListItem[] = cd.data?.list ?? [];
  const tiroidesCamps = allCamps.filter((c) => {
    const name = (c.campaign_name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return /tiroides/.test(name);
  });

  if (tiroidesCamps.length === 0) {
    return NextResponse.json({
      configured: true,
      spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, cpa: 0,
      campaigns: [],
      note: "Sin campañas TIROIDES en TikTok",
      rango: `${range.since} → ${range.until}`,
    });
  }

  // 2. Pedir insights agregados por campaña
  const reportUrl = new URL(`${BASE}/report/integrated/get/`);
  reportUrl.searchParams.set("advertiser_id", ADV_ID);
  reportUrl.searchParams.set("report_type", "BASIC");
  reportUrl.searchParams.set("data_level", "AUCTION_CAMPAIGN");
  reportUrl.searchParams.set("dimensions", JSON.stringify(["campaign_id"]));
  reportUrl.searchParams.set("metrics", JSON.stringify([
    "spend", "impressions", "clicks", "ctr", "cpc", "cpm",
    "reach", "conversion", "cost_per_conversion", "video_play_actions",
  ]));
  reportUrl.searchParams.set("start_date", range.since);
  reportUrl.searchParams.set("end_date", range.until);
  reportUrl.searchParams.set("filters", JSON.stringify([{
    field_name: "campaign_ids",
    filter_type: "IN",
    filter_value: JSON.stringify(tiroidesCamps.map((c) => c.campaign_id)),
  }]));
  reportUrl.searchParams.set("page_size", "100");

  const rr = await fetch(reportUrl.toString(), { headers, cache: "no-store" });
  if (!rr.ok) {
    return NextResponse.json({ error: "tiktok report fetch failed", status: rr.status }, { status: 502 });
  }
  const rd = await rr.json();
  if (rd.code !== 0) {
    return NextResponse.json({ error: "tiktok report api error", detail: rd.message }, { status: 502 });
  }
  const rows: TikTokInsightRow[] = rd.data?.list ?? [];

  // Indexar insights por campaign_id
  const insightsById = new Map<string, TikTokInsightRow["metrics"]>();
  for (const row of rows) {
    const id = row.dimensions?.campaign_id;
    if (id) insightsById.set(id, row.metrics ?? {});
  }

  const campaigns: TikTokCampaign[] = tiroidesCamps.map((c) => {
    const m = insightsById.get(c.campaign_id) ?? {};
    const spend = parseFloat(m.spend ?? "0");
    const impressions = parseInt(m.impressions ?? "0");
    const clicks = parseInt(m.clicks ?? "0");
    const conversions = parseInt(m.conversion ?? "0");
    return {
      id: c.campaign_id,
      name: c.campaign_name,
      status: c.operation_status ?? "—",
      spend: Math.round(spend),
      impressions,
      clicks,
      ctr: parseFloat(m.ctr ?? "0"),
      cpc: Math.round(parseFloat(m.cpc ?? "0")),
      cpm: Math.round(parseFloat(m.cpm ?? "0")),
      reach: parseInt(m.reach ?? "0"),
      conversions,
      cpa: conversions > 0 ? Math.round(spend / conversions) : 0,
      videoViews: parseInt(m.video_play_actions ?? "0"),
    };
  });

  const totalSpend = campaigns.reduce((a, c) => a + c.spend, 0);
  const totalImpr = campaigns.reduce((a, c) => a + c.impressions, 0);
  const totalClicks = campaigns.reduce((a, c) => a + c.clicks, 0);
  const totalConv = campaigns.reduce((a, c) => a + c.conversions, 0);
  const totalVideoViews = campaigns.reduce((a, c) => a + c.videoViews, 0);

  return NextResponse.json({
    configured: true,
    spend: totalSpend,
    impressions: totalImpr,
    clicks: totalClicks,
    conversions: totalConv,
    videoViews: totalVideoViews,
    ctr: totalImpr > 0 ? Number(((totalClicks / totalImpr) * 100).toFixed(2)) : 0,
    cpc: totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0,
    cpa: totalConv > 0 ? Math.round(totalSpend / totalConv) : 0,
    campaigns,
    rango: `${range.since} → ${range.until}`,
  });
}
