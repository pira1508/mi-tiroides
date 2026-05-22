"use client";

import { useEffect, useMemo, useState } from "react";

type QuizEvent = {
  ts: string;
  event: string;
  score: number | null;
  segment: string | null;
  plan: string | null;
  answers: number[] | null;
};

type DateRange = "hoy" | "ayer" | "7d" | "14d" | "30d" | "este_mes" | "mes_pasado" | "todo" | "custom";

const RANGE_PRESETS: { id: DateRange; label: string }[] = [
  { id: "todo",        label: "Todo" },
  { id: "hoy",         label: "Hoy" },
  { id: "ayer",        label: "Ayer" },
  { id: "7d",          label: "7 días" },
  { id: "14d",         label: "14 días" },
  { id: "30d",         label: "30 días" },
  { id: "este_mes",    label: "Este mes" },
  { id: "mes_pasado",  label: "Mes pasado" },
];

function rangoToFechas(r: DateRange, customSince?: string, customUntil?: string): { since: Date | null; until: Date | null } {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
  switch (r) {
    case "hoy": return { since: inicioHoy, until: finHoy };
    case "ayer": {
      const y = new Date(inicioHoy); y.setDate(y.getDate() - 1);
      const yEnd = new Date(y); yEnd.setHours(23, 59, 59, 999);
      return { since: y, until: yEnd };
    }
    case "7d":  { const s = new Date(inicioHoy); s.setDate(s.getDate() - 7);  return { since: s, until: finHoy }; }
    case "14d": { const s = new Date(inicioHoy); s.setDate(s.getDate() - 14); return { since: s, until: finHoy }; }
    case "30d": { const s = new Date(inicioHoy); s.setDate(s.getDate() - 30); return { since: s, until: finHoy }; }
    case "este_mes":   { return { since: new Date(ahora.getFullYear(), ahora.getMonth(), 1), until: finHoy }; }
    case "mes_pasado": {
      const s = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const e = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59, 999);
      return { since: s, until: e };
    }
    case "custom": {
      if (!customSince || !customUntil) return { since: null, until: null };
      return { since: new Date(customSince + "T00:00:00"), until: new Date(customUntil + "T23:59:59") };
    }
    default: return { since: null, until: null };
  }
}

type Stats = {
  total: number;
  started: number;
  completed: number;
  resultClick: number;
  landed: number;
  bySegment: Record<string, number>;
  byPlan: Record<string, number>;
  avgScore: number;
  completionRate: number;
  resultClickRate: number;
};

function computeStats(events: QuizEvent[]): Stats {
  const started = events.filter((e) => e.event === "started").length;
  const completed = events.filter((e) => e.event === "completed").length;
  const resultClick = events.filter((e) => e.event === "result_click").length;
  const landed = events.filter((e) => e.event === "landed_landing").length;

  const bySegment: Record<string, number> = {};
  const byPlan: Record<string, number> = {};
  const scores: number[] = [];

  for (const e of events.filter((x) => x.event === "completed")) {
    if (e.segment) bySegment[e.segment] = (bySegment[e.segment] || 0) + 1;
    if (e.plan) byPlan[e.plan] = (byPlan[e.plan] || 0) + 1;
    if (typeof e.score === "number") scores.push(e.score);
  }

  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    total: events.length,
    started,
    completed,
    resultClick,
    landed,
    bySegment,
    byPlan,
    avgScore,
    completionRate: started > 0 ? (completed / started) * 100 : 0,
    resultClickRate: completed > 0 ? (resultClick / completed) * 100 : 0,
  };
}

export function QuizFunnel() {
  const [events, setEvents] = useState<QuizEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("todo");
  const [customSince, setCustomSince] = useState<string>("");
  const [customUntil, setCustomUntil] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/track-quiz");
        const data = await r.json();
        setEvents(data.events || []);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 30000); // refresh cada 30s
    return () => clearInterval(t);
  }, []);

  const eventosFiltrados = useMemo(() => {
    const { since, until } = rangoToFechas(dateRange, customSince, customUntil);
    if (!since || !until) return events;
    return events.filter((e) => {
      const t = new Date(e.ts).getTime();
      return t >= since.getTime() && t <= until.getTime();
    });
  }, [events, dateRange, customSince, customUntil]);

  if (loading) return <div style={{ padding: 24 }}>Cargando datos del quiz...</div>;
  if (error) return <div style={{ padding: 24, color: "#b53b2a" }}>Error: {error}</div>;

  const stats = computeStats(eventosFiltrados);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>🧠 Quiz Funnel</h2>
      <p style={{ color: "#6a6a6a", fontSize: 13 }}>
        Datos en tiempo real del flujo de quiz (/test). Refresca cada 30 segundos.
      </p>

      {/* Filtro de fechas */}
      <div style={{
        background: "#fff",
        border: "1px solid #ebe2cc",
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 12, color: "#6a6a6a", marginRight: 4, fontWeight: 600 }}>📅 Rango:</span>
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setDateRange(p.id)}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              borderRadius: 4,
              border: "1px solid " + (dateRange === p.id ? "#1f3d2b" : "#ebe2cc"),
              background: dateRange === p.id ? "#1f3d2b" : "#fff",
              color: dateRange === p.id ? "#fff" : "#333",
              fontWeight: dateRange === p.id ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setDateRange("custom")}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            borderRadius: 4,
            border: "1px solid " + (dateRange === "custom" ? "#1f3d2b" : "#ebe2cc"),
            background: dateRange === "custom" ? "#1f3d2b" : "#fff",
            color: dateRange === "custom" ? "#fff" : "#333",
            fontWeight: dateRange === "custom" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          Personalizado
        </button>
        {dateRange === "custom" && (
          <>
            <input type="date" value={customSince} onChange={(e) => setCustomSince(e.target.value)} style={{ padding: "4px 8px", fontSize: 11, border: "1px solid #ebe2cc", borderRadius: 4 }} />
            <span style={{ fontSize: 11 }}>→</span>
            <input type="date" value={customUntil} onChange={(e) => setCustomUntil(e.target.value)} style={{ padding: "4px 8px", fontSize: 11, border: "1px solid #ebe2cc", borderRadius: 4 }} />
          </>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#6a6a6a" }}>
          {eventosFiltrados.length} eventos en rango (de {events.length} totales)
        </span>
      </div>

      {/* KPIs principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Card label="Quizzes iniciados" value={stats.started.toString()} />
        <Card label="Quizzes completados" value={stats.completed.toString()} sub={`${stats.completionRate.toFixed(0)}% completion`} />
        <Card label="Clicks a comprar" value={stats.resultClick.toString()} sub={`${stats.resultClickRate.toFixed(0)}% del completed`} />
        <Card label="Llegaron al landing" value={stats.landed.toString()} />
        <Card label="Puntaje promedio" value={stats.avgScore.toFixed(1)} sub="/ 16" />
      </div>

      {/* Embudo visual */}
      <h3>Embudo</h3>
      <div style={{ marginBottom: 32 }}>
        <FunnelBar label="Iniciaron quiz" value={stats.started} max={Math.max(stats.started, 1)} color="#1f3d2b" />
        <FunnelBar label="Completaron 6/6 preguntas" value={stats.completed} max={Math.max(stats.started, 1)} color="#2f5a3f" />
        <FunnelBar label="Click 'Quiero mi tratamiento'" value={stats.resultClick} max={Math.max(stats.started, 1)} color="#c9a14a" />
        <FunnelBar label="Aterrizaron en landing" value={stats.landed} max={Math.max(stats.started, 1)} color="#b53b2a" />
      </div>

      {/* Distribución por segmento */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div>
          <h3>Por segmento</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(stats.bySegment).map(([k, v]) => (
              <li key={k} style={{ padding: "8px 0", borderBottom: "1px solid #ebe2cc" }}>
                <strong>{v}</strong> · {k} ({stats.completed > 0 ? ((v / stats.completed) * 100).toFixed(0) : 0}%)
              </li>
            ))}
            {Object.keys(stats.bySegment).length === 0 && <li style={{ color: "#999" }}>Sin datos aún</li>}
          </ul>
        </div>
        <div>
          <h3>Plan recomendado</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(stats.byPlan).map(([k, v]) => (
              <li key={k} style={{ padding: "8px 0", borderBottom: "1px solid #ebe2cc" }}>
                <strong>{v}</strong> · {k} {Number(k) === 1 ? "frasco" : "frascos"} ({stats.completed > 0 ? ((v / stats.completed) * 100).toFixed(0) : 0}%)
              </li>
            ))}
            {Object.keys(stats.byPlan).length === 0 && <li style={{ color: "#999" }}>Sin datos aún</li>}
          </ul>
        </div>
      </div>

      {/* Últimos eventos */}
      <h3>Últimos eventos (50)</h3>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5efe2", textAlign: "left" }}>
            <th style={{ padding: 8 }}>Timestamp</th>
            <th style={{ padding: 8 }}>Evento</th>
            <th style={{ padding: 8 }}>Score</th>
            <th style={{ padding: 8 }}>Segmento</th>
            <th style={{ padding: 8 }}>Plan</th>
          </tr>
        </thead>
        <tbody>
          {[...eventosFiltrados].reverse().slice(0, 50).map((e, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ebe2cc" }}>
              <td style={{ padding: 8, color: "#6a6a6a" }}>
                {new Date(e.ts).toLocaleString("es-CO", { timeZone: "America/Bogota" })}
              </td>
              <td style={{ padding: 8 }}><EventBadge name={e.event} /></td>
              <td style={{ padding: 8 }}>{e.score ?? "—"}</td>
              <td style={{ padding: 8 }}>{e.segment ?? "—"}</td>
              <td style={{ padding: 8 }}>{e.plan ?? "—"}</td>
            </tr>
          ))}
          {events.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#999" }}>
              Sin eventos aún. Cuando alguien complete el quiz aparecerá aquí.
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ebe2cc", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#6a6a6a", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#1f3d2b" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span>
        <span><strong>{value}</strong> ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: 24, background: "#f5efe2", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function EventBadge({ name }: { name: string }) {
  const colors: Record<string, string> = {
    started: "#1f3d2b",
    completed: "#2f5a3f",
    result_click: "#c9a14a",
    landed_landing: "#b53b2a",
  };
  const color = colors[name] || "#6a6a6a";
  return (
    <span style={{
      background: color,
      color: "#fff",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
    }}>{name}</span>
  );
}
