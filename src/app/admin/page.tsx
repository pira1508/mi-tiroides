"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "./pira-admin.css";
import { CRM } from "./tabs/crm";
import { Pipeline } from "./tabs/pipeline";
import { Shipping } from "./tabs/shipping";
import { Products } from "./tabs/products";
import { Atencion } from "./tabs/atencion";
import { Calculadora } from "./tabs/calculadora";
import { Novedades } from "./tabs/novedades";
import { QuizFunnel } from "./tabs/quiz-funnel";

type Pedido = {
  id: string;
  nombre: string;
  telefonoCliente: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  referencia?: string;
  cantidad: number;
  diasTratamiento: number;
  total: number;
  creadoEn: string;
  actualizadoEn?: string;
  estado: "nuevo" | "confirmado" | "despachado" | "entregado" | "cancelado";
  fuente?: string | null;
  fuenteRaw?: string | null;
};

// Mapeo fuente → { label, icono, color }
const FUENTES: Record<string, { label: string; icon: string; color: string }> = {
  meta:     { label: "Meta",      icon: "📘", color: "#1877F2" },
  tiktok:   { label: "TikTok",    icon: "🎵", color: "#000000" },
  google:   { label: "Google",    icon: "🔍", color: "#4285F4" },
  organico: { label: "Orgánico",  icon: "🌱", color: "#16A34A" },
};
function fuenteInfo(f?: string | null) {
  if (!f) return FUENTES.organico;
  return FUENTES[f] || { label: f, icon: "🔗", color: "#64748B" };
}

type AbStats = {
  visitasHoy: number;
  aperturasHoy: number;
  pedidosHoy: number;
  visitasTotal: number;
  aperturasTotal: number;
  pedidosTotal: number;
  ingresos: number;
};

type Stats = {
  total: number;
  nuevos: number;
  confirmados: number;
  despachados: number;
  entregados: number;
  cancelados: number;
  ingresosTotales: number;
  visitasHoy?: number;
  aperturasHoy?: number;
  pedidosHoy?: number;
  visitasTotal?: number;
  aperturasTotal?: number;
  rango?: { from: string; to: string; hoy: string };
  ab?: { v1?: AbStats; v2?: AbStats };
};

type TabId = "dashboard" | "live" | "ab" | "ads" | "crm" | "pipeline" | "shipping" | "products" | "atencion" | "calculadora" | "novedades" | "quiz";

const ESTADOS: Pedido["estado"][] = ["nuevo", "confirmado", "despachado", "entregado", "cancelado"];

const PILL_ESTADO: Record<Pedido["estado"], string> = {
  nuevo: "warning",
  confirmado: "info",
  despachado: "accent",
  entregado: "success",
  cancelado: "danger",
};

function fmtCOP(n: number) {
  return "$" + n.toLocaleString("es-CO");
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
}
function fechaBogota(iso: string): string {
  const d = new Date(iso);
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}
function hoyBogota(): string {
  const ahora = new Date();
  const bogota = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}
function diasAtrasBogota(n: number): string {
  const ahora = new Date();
  const bogota = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  bogota.setUTCDate(bogota.getUTCDate() - n);
  return bogota.toISOString().slice(0, 10);
}

type PresetRango = { label: string; from: string; to: string };
function presetsRango(): PresetRango[] {
  const hoy = hoyBogota();
  return [
    { label: "Hoy", from: hoy, to: hoy },
    { label: "Ayer", from: diasAtrasBogota(1), to: diasAtrasBogota(1) },
    { label: "7d", from: diasAtrasBogota(6), to: hoy },
    { label: "30d", from: diasAtrasBogota(29), to: hoy },
    { label: "Máximo", from: "2026-01-01", to: hoy },
  ];
}

// ============ Iconos (subset del prototipo) ============
function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    home: <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" />,
    activity: <path d="M22 12h-4l-3 9-6-18-3 9H2" />,
    flask: <><path d="M9 3v6L4 19a2 2 0 0 0 1.7 3h12.6A2 2 0 0 0 20 19L15 9V3" /><path d="M9 3h6M7 14h10" /></>,
    target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />,
    cash: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>,
    cart: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></>,
    eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></>,
    bolt: <path d="m13 2-3 14h7l-3 6 11-14h-7l1-6h-6Z" />,
    box: <><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /></>,
    fb: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] || null}
    </svg>
  );
}

// ============ Sparkline ============
function Sparkline({ data, color = "#0F3D2E", width = 100, height = 32 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data.length) return <svg width={width} height={height} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const x = (i: number) => (i / (data.length - 1 || 1)) * width;
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * height;
  const path = data.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
      <path d={path + ` L ${width} ${height} L 0 ${height} Z`} fill={color} opacity="0.12" />
    </svg>
  );
}

// ============ Line/Area Chart con tooltip ============
function LineChart({
  data,
  height = 200,
  color = "#0F3D2E",
  format = (v: number) => String(v),
  xLabel = (d: { label: string }) => d.label,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  format?: (v: number) => string;
  xLabel?: (d: { label: string }, i: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return null;
  const W = 800;
  const padding = { top: 16, right: 14, bottom: 28, left: 56 };
  const innerW = W - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxV = Math.max(...data.map((d) => d.value), 1) * 1.15;
  const x = (i: number) => padding.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - (v / maxV) * innerH;
  const path = data.map((d, i) => `${i ? "L" : "M"} ${x(i)} ${y(d.value)}`).join(" ");
  const areaPath = path + ` L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padding.left} x2={W - padding.right} y1={padding.top + innerH * (1 - t)} y2={padding.top + innerH * (1 - t)}
              stroke="var(--border)" strokeDasharray={t === 0 ? "" : "2 3"} />
            <text x={padding.left - 8} y={padding.top + innerH * (1 - t) + 3} fontSize="10" fill="var(--text-muted)" textAnchor="end" fontFamily="var(--font-mono)">
              {format(maxV * t)}
            </text>
          </g>
        ))}
        <path d={areaPath} fill={color} opacity="0.12" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.value)} r={hover === i ? 5 : 0} fill={color} />
            {i % Math.max(1, Math.ceil(data.length / 8)) === 0 && (
              <text x={x(i)} y={height - 10} fontSize="10" fill="var(--text-muted)" textAnchor="middle">{xLabel(d, i)}</text>
            )}
            <rect x={x(i) - innerW / data.length / 2} y={padding.top} width={innerW / data.length} height={innerH} fill="transparent"
              onMouseEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div style={{
          position: "absolute",
          left: `${(x(hover) / W) * 100}%`,
          top: 4,
          transform: "translate(-50%, 0)",
          background: "var(--text)",
          color: "var(--panel)",
          padding: "5px 9px",
          borderRadius: 4,
          fontSize: 11,
          fontVariantNumeric: "tabular-nums",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "var(--shadow)",
        }}>
          <div style={{ fontWeight: 600 }}>{xLabel(data[hover], hover)}</div>
          <div>{format(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

// ============ Ring chart (donut) ============
function Ring({ value, max, color = "#0F3D2E", size = 100, label, sub }: { value: number; max: number; color?: string; size?: number; label: string; sub?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--panel-sub)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="num" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{label}</div>
          {sub && <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ============ Bar chart simple ============
function BarChart({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1) * 1.15;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "8px 0" }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 24);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
            <div className="num" style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.value || ""}</div>
            <div style={{ width: "100%", maxWidth: 32, height: h, background: "var(--brand)", borderRadius: 3, opacity: 0.85 }} />
            <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============ MAIN PAGE ============
export default function AdminPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [atencionTotal, setAtencionTotal] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [from, setFrom] = useState<string>(hoyBogota());
  const [to, setTo] = useState<string>(hoyBogota());
  const [seleccionado, setSeleccionado] = useState<Pedido | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | Pedido["estado"]>("todos");
  const [filtroFuente, setFiltroFuente] = useState<"todas" | "meta" | "tiktok" | "organico" | "otros">("todas");
  const [busqueda, setBusqueda] = useState("");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  async function cargar() {
    const params = new URLSearchParams({ from, to });
    const r = await fetch(`/api/admin/pedidos?${params}`, { cache: "no-store" });
    if (r.status === 401) {
      router.push("/admin/login");
      return;
    }
    if (!r.ok) {
      setError("Error cargando pedidos");
      setLoading(false);
      return;
    }
    const data = await r.json();
    setPedidos(data.pedidos || []);
    setStats(data.stats || null);
    setLoading(false);
    setError("");
  }

  useEffect(() => {
    cargar();
    if (paused) return;
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, paused]);

  useEffect(() => {
    async function cargarAtencion() {
      try {
        const r = await fetch("/api/admin/atencion", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          setAtencionTotal(Array.isArray(data) ? data.length : 0);
        }
      } catch {}
    }
    cargarAtencion();
    const t = setInterval(cargarAtencion, 10000);
    return () => clearInterval(t);
  }, []);

  async function cambiarEstado(id: string, estado: Pedido["estado"]) {
    const r = await fetch("/api/admin/pedidos", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });
    if (r.ok) {
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
      if (seleccionado?.id === id) setSeleccionado({ ...seleccionado, estado });
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  // Derivados
  const pedidosRango = useMemo(() => {
    return pedidos.filter((p) => {
      const fp = fechaBogota(p.creadoEn);
      return fp >= from && fp <= to && p.estado !== "cancelado";
    });
  }, [pedidos, from, to]);

  const ingresosRango = pedidosRango.reduce((a, p) => a + p.total, 0);
  const frascosRango = pedidosRango.reduce((a, p) => a + (p.cantidad || 0), 0);
  const ticketProm = pedidosRango.length ? Math.round(ingresosRango / pedidosRango.length) : 0;
  const unreadTotal = stats?.nuevos ?? 0;

  // Pedidos por día (últimos 14 días) para sparklines
  const sparkPedidos = useMemo(() => {
    const dias: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = diasAtrasBogota(i);
      const count = pedidos.filter((p) => fechaBogota(p.creadoEn) === d && p.estado !== "cancelado").length;
      dias.push(count);
    }
    return dias;
  }, [pedidos]);

  const sparkIngresos = useMemo(() => {
    const dias: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = diasAtrasBogota(i);
      const v = pedidos.filter((p) => fechaBogota(p.creadoEn) === d && p.estado !== "cancelado").reduce((a, p) => a + p.total, 0);
      dias.push(v);
    }
    return dias;
  }, [pedidos]);

  // Pedidos filtrados (para tabla)
  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (filtroFuente !== "todas") {
        const f = p.fuente || "organico";
        if (filtroFuente === "otros") {
          // "otros" = todo lo que no sea meta/tiktok/organico (ej: google, utm crudo)
          if (f === "meta" || f === "tiktok" || f === "organico") return false;
        } else if (f !== filtroFuente) {
          return false;
        }
      }
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.telefonoCliente.includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.ciudad || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pedidos, filtroEstado, filtroFuente, busqueda]);

  // Contar pedidos por fuente (para mostrar conteos en el segmented)
  const fuentesCounts = useMemo(() => {
    const c = { todas: pedidos.length, meta: 0, tiktok: 0, organico: 0, otros: 0 };
    for (const p of pedidos) {
      const f = p.fuente || "organico";
      if (f === "meta") c.meta++;
      else if (f === "tiktok") c.tiktok++;
      else if (f === "organico") c.organico++;
      else c.otros++;
    }
    return c;
  }, [pedidos]);

  // Top ciudades
  const topCiudades = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pedidosRango) {
      const k = p.ciudad || "—";
      map.set(k, (map.get(k) || 0) + p.cantidad);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [pedidosRango]);

  // Series de tiempo (días entre from y to)
  const serieDias = useMemo(() => {
    const result: { date: string; pedidos: number; ingresos: number; frascos: number }[] = [];
    const start = new Date(from + "T12:00:00");
    const end = new Date(to + "T12:00:00");
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = pedidos.filter((p) => fechaBogota(p.creadoEn) === dateStr && p.estado !== "cancelado");
      result.push({
        date: dateStr,
        pedidos: dayOrders.length,
        ingresos: dayOrders.reduce((a, p) => a + p.total, 0),
        frascos: dayOrders.reduce((a, p) => a + p.cantidad, 0),
      });
    }
    return result;
  }, [pedidos, from, to]);

  // Distribución por cantidad de frascos
  const distribFrascos = useMemo(() => {
    const map: Record<number, number> = {};
    for (const p of pedidosRango) map[p.cantidad] = (map[p.cantidad] || 0) + 1;
    return Object.entries(map).map(([k, v]) => ({ label: `${k} frasco${Number(k) > 1 ? "s" : ""}`, value: v })).sort((a, b) => Number(b.label[0]) - Number(a.label[0]));
  }, [pedidosRango]);

  const presetActivo = presetsRango().find((p) => p.from === from && p.to === to);

  const TABS: { id: TabId; label: string; icon: string; group: string; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: "home", group: "Operación" },
    { id: "live", label: "Pedidos en vivo", icon: "activity", group: "Operación", badge: unreadTotal },
    { id: "pipeline", label: "Pipeline pedidos", icon: "activity", group: "Operación" },
    { id: "atencion", label: "⚠️ Atención", icon: "activity", group: "Operación", badge: atencionTotal },
    { id: "novedades", label: "🚚 Novedades", icon: "box", group: "Operación" },
    { id: "ab", label: "A/B Testing", icon: "flask", group: "Crecimiento" },
    { id: "ads", label: "Ads Manager", icon: "target", group: "Crecimiento" },
    { id: "quiz", label: "🧠 Quiz Funnel", icon: "flask", group: "Crecimiento" },
    { id: "calculadora", label: "Calculadora", icon: "flask", group: "Crecimiento" },
    { id: "crm", label: "CRM · WhatsApp", icon: "cart", group: "Clientes" },
    { id: "shipping", label: "Transportadora", icon: "box", group: "Clientes" },
    { id: "products", label: "Productos", icon: "box", group: "Catálogo" },
  ];

  const grouped = TABS.reduce<Record<string, typeof TABS>>((acc, t) => {
    (acc[t.group] = acc[t.group] || []).push(t);
    return acc;
  }, {});

  const activeMeta = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">PIRA · admin</div>
            <div className="brand-sub">mi tiroides</div>
          </div>
        </div>
        {Object.entries(grouped).map(([group, tabs]) => (
          <div key={group}>
            <div className="nav-group-label">{group}</div>
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`nav-item ${activeTab === t.id ? "active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="nav-icon"><Icon name={t.icon} size={15} /></span>
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && <span className="nav-badge warning">{t.badge}</span>}
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-foot">
          <div className="user-avatar">JP</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Juan Pira</div>
            <div className="muted" style={{ fontSize: 10.5 }}>Owner</div>
          </div>
          <button className="btn btn-icon ghost" title="Tema" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            <Icon name={theme === "light" ? "moon" : "sun"} size={13} />
          </button>
          <button className="btn btn-icon ghost" title="Salir" onClick={logout}>↪</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-crumbs">{activeMeta.group}</div>
            <div className="topbar-title">{activeMeta.label}</div>
          </div>
          <div className="topbar-actions">
            <input
              className="search-input"
              placeholder="Buscar pedido, cliente, ciudad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div className="segmented">
              {presetsRango().map((p) => (
                <button
                  key={p.label}
                  className={presetActivo?.label === p.label ? "active" : ""}
                  onClick={() => { setFrom(p.from); setTo(p.to); }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button className="btn" onClick={cargar}>
              <Icon name="refresh" size={12} /> Actualizar
            </button>
          </div>
        </header>

        <main className="content">
          {error && <div className="card" style={{ padding: 12, marginBottom: 16, color: "var(--danger)", background: "var(--danger-soft)" }}>{error}</div>}

          {activeTab === "dashboard" && (
            <Dashboard
              stats={stats}
              pedidosRango={pedidosRango}
              ingresosRango={ingresosRango}
              frascosRango={frascosRango}
              ticketProm={ticketProm}
              sparkPedidos={sparkPedidos}
              sparkIngresos={sparkIngresos}
              topCiudades={topCiudades}
              serieDias={serieDias}
              distribFrascos={distribFrascos}
              pedidos={pedidos}
              onVerPedido={setSeleccionado}
            />
          )}

          {activeTab === "live" && (
            <LiveOrders
              pedidos={filtrados}
              loading={loading}
              filtroEstado={filtroEstado}
              setFiltroEstado={setFiltroEstado}
              filtroFuente={filtroFuente}
              setFiltroFuente={setFiltroFuente}
              fuentesCounts={fuentesCounts}
              estadosCounts={{
                todos: pedidos.length,
                nuevo: stats?.nuevos ?? 0,
                confirmado: stats?.confirmados ?? 0,
                despachado: stats?.despachados ?? 0,
                entregado: stats?.entregados ?? 0,
                cancelado: stats?.cancelados ?? 0,
              }}
              paused={paused}
              setPaused={setPaused}
              onVerPedido={setSeleccionado}
            />
          )}

          {activeTab === "ab" && <ABTesting stats={stats} />}

          {activeTab === "ads" && <AdsManager />}

          {activeTab === "crm" && <CRM />}

          {activeTab === "pipeline" && <Pipeline />}

          {activeTab === "atencion" && <Atencion />}

          {activeTab === "shipping" && <Shipping />}

          {activeTab === "products" && <Products />}

          {activeTab === "calculadora" && <Calculadora />}

          {activeTab === "novedades" && <Novedades />}
          {activeTab === "quiz" && <QuizFunnel />}
        </main>
      </div>

      {/* MODAL PEDIDO */}
      {seleccionado && (
        <div onClick={() => setSeleccionado(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card" style={{ maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <div className="card-header">
              <div style={{ flex: 1 }}>
                <div className="label">Pedido</div>
                <div className="h2 mono">{seleccionado.id}</div>
              </div>
              <span className={`pill ${PILL_ESTADO[seleccionado.estado]}`}>{seleccionado.estado.toUpperCase()}</span>
              <button className="btn btn-icon ghost" onClick={() => setSeleccionado(null)}>×</button>
            </div>
            <div className="card-body">
              <Field label="Cliente" value={seleccionado.nombre} />
              <Field
                label="Teléfono"
                value={
                  <a href={`https://wa.me/${seleccionado.telefonoCliente}`} target="_blank" style={{ color: "var(--brand-ink)", textDecoration: "none" }}>
                    {seleccionado.telefonoCliente} · WhatsApp
                  </a>
                }
              />
              <Field
                label="Dirección"
                value={`${seleccionado.direccion}, ${seleccionado.ciudad}${seleccionado.departamento ? ", " + seleccionado.departamento : ""}`}
              />
              {seleccionado.referencia && <Field label="Referencia" value={seleccionado.referencia} />}
              <Field label="Frascos" value={`${seleccionado.cantidad} (${seleccionado.diasTratamiento} días)`} />
              <Field label="Total" value={<strong className="num">{fmtCOP(seleccionado.total)}</strong>} />
              <Field
                label="Fuente"
                value={(() => {
                  const fu = fuenteInfo(seleccionado.fuente);
                  return (
                    <span title={seleccionado.fuenteRaw || ""} style={{ color: fu.color, fontWeight: 600 }}>
                      {fu.icon} {fu.label}
                      {seleccionado.fuenteRaw && (
                        <span className="muted" style={{ marginLeft: 6, fontSize: 11, fontWeight: 400 }}>
                          ({seleccionado.fuenteRaw.length > 50 ? seleccionado.fuenteRaw.slice(0, 50) + "…" : seleccionado.fuenteRaw})
                        </span>
                      )}
                    </span>
                  );
                })()}
              />
              <Field label="Creado" value={<span className="mono">{fmtFecha(seleccionado.creadoEn)}</span>} />

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div className="label" style={{ marginBottom: 8 }}>Cambiar estado</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ESTADOS.map((e) => (
                    <button
                      key={e}
                      onClick={() => cambiarEstado(seleccionado.id, e)}
                      disabled={seleccionado.estado === e}
                      className={`btn ${seleccionado.estado === e ? "primary" : ""}`}
                    >
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  className="btn"
                  onClick={() => {
                    const txt = `${seleccionado.nombre}\n${seleccionado.telefonoCliente}\n${seleccionado.direccion}\n${seleccionado.ciudad}${seleccionado.departamento ? ", " + seleccionado.departamento : ""}\n${seleccionado.cantidad} frasco(s) - ${fmtCOP(seleccionado.total)}`;
                    navigator.clipboard.writeText(txt);
                    alert("Copiado para guía de envío");
                  }}
                >
                  📋 Copiar para guía de envío
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ TAB: DASHBOARD ============
function Dashboard({
  stats,
  pedidosRango,
  ingresosRango,
  frascosRango,
  ticketProm,
  sparkPedidos,
  sparkIngresos,
  topCiudades,
  serieDias,
  distribFrascos,
  pedidos,
  onVerPedido,
}: {
  stats: Stats | null;
  pedidosRango: Pedido[];
  ingresosRango: number;
  frascosRango: number;
  ticketProm: number;
  sparkPedidos: number[];
  sparkIngresos: number[];
  topCiudades: { label: string; value: number }[];
  serieDias: { date: string; pedidos: number; ingresos: number; frascos: number }[];
  distribFrascos: { label: string; value: number }[];
  pedidos: Pedido[];
  onVerPedido: (p: Pedido) => void;
}) {
  const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) + "%" : "0%");
  const visitas = stats?.visitasHoy ?? 0;
  const aperturas = stats?.aperturasHoy ?? 0;

  return (
    <>
      <LiveUsersBar />

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <Kpi
          label="Visitas"
          value={visitas.toLocaleString("es-CO")}
          icon={<Icon name="eye" size={14} />}
          foot={`${stats?.visitasTotal ?? 0} histórico`}
        />
        <Kpi
          label="Aperturas form"
          value={aperturas.toLocaleString("es-CO")}
          icon={<Icon name="bolt" size={14} />}
          foot={visitas ? `${pct(aperturas, visitas)} de visitas` : undefined}
        />
        <Kpi
          label="Pedidos"
          value={String(pedidosRango.length)}
          icon={<Icon name="cart" size={14} />}
          foot={aperturas ? `${pct(pedidosRango.length, aperturas)} conv.` : undefined}
          spark={sparkPedidos}
        />
        <Kpi
          label="Frascos vendidos"
          value={String(frascosRango)}
          icon={<Icon name="box" size={14} />}
          foot={pedidosRango.length ? `${(frascosRango / pedidosRango.length).toFixed(2)} frascos/pedido` : undefined}
        />
        <Kpi
          label="Ingresos"
          value={fmtCOP(ingresosRango)}
          icon={<Icon name="cash" size={14} />}
          spark={sparkIngresos}
          accent="success"
        />
        <Kpi
          label="Ticket promedio"
          value={fmtCOP(ticketProm)}
          foot={pedidosRango.length ? `${pedidosRango.length} pedidos` : undefined}
        />
      </div>

      {/* Embudo + Top ciudades */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="h2">Embudo del rango</div>
          </div>
          <div className="card-body">
            <FunnelRow label="Visitas" value={visitas} total={visitas} color="#635BFF" />
            <FunnelRow label="Abrieron formulario" value={aperturas} total={visitas} color="#7C3AED" />
            <FunnelRow label="Initiate checkout" value={pedidosRango.length * 5} total={visitas} color="#0284C7" />
            <FunnelRow label="Pedidos confirmados" value={pedidosRango.length} total={visitas} color="#16A34A" />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="h2">Top ciudades (frascos)</div>
            <span className="muted" style={{ fontSize: 11 }}>{pedidosRango.length} pedidos</span>
          </div>
          <div className="card-body">
            {topCiudades.length === 0 ? (
              <div className="muted" style={{ textAlign: "center", padding: 30 }}>Sin datos en el rango</div>
            ) : (
              <BarChart data={topCiudades} />
            )}
          </div>
        </div>
      </div>

      {/* Gráficos clave */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="h2">Ingresos diarios</div>
          <span className="muted" style={{ fontSize: 11 }}>{serieDias.length} días · total {fmtCOP(ingresosRango)}</span>
        </div>
        <div className="card-body">
          {serieDias.length === 0 || serieDias.every(d => d.ingresos === 0) ? (
            <div className="muted" style={{ textAlign: "center", padding: 30 }}>Sin datos en el rango</div>
          ) : (
            <LineChart
              data={serieDias.map(d => ({ label: d.date.slice(5), value: d.ingresos }))}
              height={220}
              color="#16A34A"
              format={(v) => "$" + (v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? Math.round(v / 1000) + "k" : Math.round(v))}
              xLabel={(d) => d.label}
            />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="h2">Pedidos diarios</div>
            <span className="muted" style={{ fontSize: 11 }}>{pedidosRango.length} pedidos · promedio {serieDias.length ? (pedidosRango.length / serieDias.length).toFixed(1) : 0}/día</span>
          </div>
          <div className="card-body">
            {serieDias.length === 0 || serieDias.every(d => d.pedidos === 0) ? (
              <div className="muted" style={{ textAlign: "center", padding: 30 }}>Sin datos en el rango</div>
            ) : (
              <LineChart
                data={serieDias.map(d => ({ label: d.date.slice(5), value: d.pedidos }))}
                height={200}
                color="#0F3D2E"
                format={(v) => String(Math.round(v))}
                xLabel={(d) => d.label}
              />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="h2">Distribución de pedidos</div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {distribFrascos.length === 0 ? (
              <div className="muted" style={{ textAlign: "center", padding: 30 }}>Sin datos</div>
            ) : (
              distribFrascos.map((d, i) => {
                const pct = (d.value / pedidosRango.length) * 100;
                const colors = ["#0F3D2E", "#635BFF", "#D97706"];
                return (
                  <div key={d.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{d.label}</span>
                      <span className="num"><strong>{d.value}</strong> · {pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 8, background: "var(--panel-sub)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: colors[i % 3], borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Conversiones key (rings) */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="h2">Métricas clave del embudo</div>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 18, justifyItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Ring
              value={stats?.aperturasTotal ?? 0}
              max={stats?.visitasTotal ?? 0}
              color="#635BFF"
              label={stats?.visitasTotal ? `${(((stats.aperturasTotal ?? 0) / stats.visitasTotal) * 100).toFixed(1)}%` : "—"}
              sub={`${stats?.aperturasTotal ?? 0} / ${stats?.visitasTotal ?? 0}`}
            />
            <div className="label" style={{ marginTop: 8 }}>Visita → Form</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <Ring
              value={stats?.total ?? 0}
              max={stats?.aperturasTotal ?? 0}
              color="#16A34A"
              label={stats?.aperturasTotal ? `${(((stats.total ?? 0) / stats.aperturasTotal) * 100).toFixed(1)}%` : "—"}
              sub={`${stats?.total ?? 0} / ${stats?.aperturasTotal ?? 0}`}
            />
            <div className="label" style={{ marginTop: 8 }}>Form → Pedido</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <Ring
              value={stats?.total ?? 0}
              max={stats?.visitasTotal ?? 0}
              color="#D97706"
              label={stats?.visitasTotal ? `${(((stats.total ?? 0) / stats.visitasTotal) * 100).toFixed(2)}%` : "—"}
              sub={`${stats?.total ?? 0} / ${stats?.visitasTotal ?? 0}`}
            />
            <div className="label" style={{ marginTop: 8 }}>Conversión total</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <Ring
              value={frascosRango}
              max={pedidosRango.length * 3}
              color="#7C3AED"
              label={pedidosRango.length ? (frascosRango / pedidosRango.length).toFixed(2) : "—"}
              sub={`${frascosRango} frascos / ${pedidosRango.length} pedidos`}
            />
            <div className="label" style={{ marginTop: 8 }}>Frascos por pedido</div>
          </div>
        </div>
      </div>

      {/* Estados de pedido */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="h2">Pedidos por estado · histórico</div>
        </div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <StatPill label="Total" n={stats?.total ?? 0} />
          <StatPill label="Nuevos" n={stats?.nuevos ?? 0} variant="warning" />
          <StatPill label="Confirmados" n={stats?.confirmados ?? 0} variant="info" />
          <StatPill label="Despachados" n={stats?.despachados ?? 0} variant="accent" />
          <StatPill label="Entregados" n={stats?.entregados ?? 0} variant="success" />
          <StatPill label="Cancelados" n={stats?.cancelados ?? 0} variant="danger" />
        </div>
      </div>

      {/* Últimos pedidos */}
      <div className="card">
        <div className="card-header">
          <div className="h2">Últimos pedidos</div>
          <span className="muted" style={{ fontSize: 11 }}>{pedidos.length} en rango</span>
        </div>
        <div className="card-body tight" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Ciudad</th>
                <th className="t-right">Frascos</th>
                <th className="t-right">Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.slice(0, 10).map((p) => (
                <tr key={p.id} className="row-clickable" onClick={() => onVerPedido(p)}>
                  <td className="mono" style={{ fontSize: 11, color: "var(--text-sub)" }}>{p.id}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{fmtFecha(p.creadoEn)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{p.telefonoCliente}</div>
                  </td>
                  <td>{p.ciudad}</td>
                  <td className="t-right num">{p.cantidad}</td>
                  <td className="t-right num"><strong>{fmtCOP(p.total)}</strong></td>
                  <td><span className={`pill ${PILL_ESTADO[p.estado]}`}>{p.estado}</span></td>
                </tr>
              ))}
              {pedidos.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>📦 Sin pedidos en el rango</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ============ TAB: LIVE ORDERS ============
function LiveOrders({
  pedidos,
  loading,
  filtroEstado,
  setFiltroEstado,
  filtroFuente,
  setFiltroFuente,
  fuentesCounts,
  estadosCounts,
  paused,
  setPaused,
  onVerPedido,
}: {
  pedidos: Pedido[];
  loading: boolean;
  filtroEstado: "todos" | Pedido["estado"];
  setFiltroEstado: (e: "todos" | Pedido["estado"]) => void;
  filtroFuente: "todas" | "meta" | "tiktok" | "organico" | "otros";
  setFiltroFuente: (f: "todas" | "meta" | "tiktok" | "organico" | "otros") => void;
  fuentesCounts: { todas: number; meta: number; tiktok: number; organico: number; otros: number };
  estadosCounts: Record<string, number>;
  paused: boolean;
  setPaused: (b: boolean) => void;
  onVerPedido: (p: Pedido) => void;
}) {
  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-body" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="segmented">
            <button className={filtroEstado === "todos" ? "active" : ""} onClick={() => setFiltroEstado("todos")}>
              Todos ({estadosCounts.todos})
            </button>
            {ESTADOS.map((e) => (
              <button key={e} className={filtroEstado === e ? "active" : ""} onClick={() => setFiltroEstado(e)}>
                {e.charAt(0).toUpperCase() + e.slice(1)} ({estadosCounts[e] || 0})
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pill success">
              <span className="dot pulse" />
              {paused ? "Pausado" : "En vivo · refresh 15s"}
            </span>
            <button className="btn" onClick={() => setPaused(!paused)}>
              {paused ? "Reanudar" : "Pausar"}
            </button>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingTop: 0 }}>
          <span className="label" style={{ marginRight: 4 }}>📊 Fuente:</span>
          <div className="segmented">
            <button className={filtroFuente === "todas" ? "active" : ""} onClick={() => setFiltroFuente("todas")}>
              Todas ({fuentesCounts.todas})
            </button>
            <button className={filtroFuente === "meta" ? "active" : ""} onClick={() => setFiltroFuente("meta")}>
              📘 Meta ({fuentesCounts.meta})
            </button>
            <button className={filtroFuente === "tiktok" ? "active" : ""} onClick={() => setFiltroFuente("tiktok")}>
              🎵 TikTok ({fuentesCounts.tiktok})
            </button>
            <button className={filtroFuente === "organico" ? "active" : ""} onClick={() => setFiltroFuente("organico")}>
              🌱 Orgánico ({fuentesCounts.organico})
            </button>
            {fuentesCounts.otros > 0 && (
              <button className={filtroFuente === "otros" ? "active" : ""} onClick={() => setFiltroFuente("otros")}>
                🔗 Otros ({fuentesCounts.otros})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body tight" style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
          ) : pedidos.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              Sin pedidos {filtroEstado !== "todos" ? `en estado "${filtroEstado}"` : "todavía"}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Ciudad</th>
                  <th>Fuente</th>
                  <th className="t-right">Frascos</th>
                  <th className="t-right">Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const fu = fuenteInfo(p.fuente);
                  return (
                  <tr key={p.id} className="row-clickable" onClick={() => onVerPedido(p)}>
                    <td className="mono" style={{ fontSize: 11, color: "var(--text-sub)" }}>{p.id}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{fmtFecha(p.creadoEn)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{p.telefonoCliente}</div>
                    </td>
                    <td>{p.ciudad}{p.departamento ? `, ${p.departamento}` : ""}</td>
                    <td>
                      <span
                        className="pill"
                        title={p.fuenteRaw || fu.label}
                        style={{ background: fu.color + "22", color: fu.color, borderColor: fu.color + "55", fontSize: 11, fontWeight: 600 }}
                      >
                        {fu.icon} {fu.label}
                      </span>
                    </td>
                    <td className="t-right num">{p.cantidad}</td>
                    <td className="t-right num"><strong>{fmtCOP(p.total)}</strong></td>
                    <td><span className={`pill ${PILL_ESTADO[p.estado]}`}>{p.estado}</span></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

// ============ TAB: A/B TESTING ============
function ABTesting({ stats }: { stats: Stats | null }) {
  if (!stats?.ab) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          Sin datos A/B disponibles en este rango.
        </div>
      </div>
    );
  }
  const a = stats.ab.v1;
  const b = stats.ab.v2;
  const pct = (num: number, den: number) => (den ? ((num / den) * 100).toFixed(2) + "%" : "—");

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <VariantCard
          letter="A"
          label="1f $89.9k · 2f $119.9k · 3f $139.9k"
          url="/"
          data={a}
          color="var(--accent)"
        />
        <VariantCard
          letter="B"
          label="1f $89.9k · 2f $139.9k · 3f $169.9k"
          url="/v2"
          data={b}
          color="var(--brand)"
          highlight
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="h2">Veredicto rápido</div>
        </div>
        <div className="card-body">
          {(() => {
            const rA = a ? (a.pedidosTotal / Math.max(a.visitasTotal, 1)) : 0;
            const rB = b ? (b.pedidosTotal / Math.max(b.visitasTotal, 1)) : 0;
            const ganador = rA === rB ? "Empate" : rA > rB ? "Variante A" : "Variante B";
            const diff = Math.abs(rA - rB) * 100;
            return (
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div className="label">Ganador estimado</div>
                  <div className="h1">{ganador}</div>
                </div>
                <div>
                  <div className="label">Diferencia conversión</div>
                  <div className="h2 num">{diff.toFixed(2)} pts</div>
                </div>
                <div>
                  <div className="label">Conversión A</div>
                  <div className="h2 num">{pct(a?.pedidosTotal ?? 0, a?.visitasTotal ?? 0)}</div>
                </div>
                <div>
                  <div className="label">Conversión B</div>
                  <div className="h2 num">{pct(b?.pedidosTotal ?? 0, b?.visitasTotal ?? 0)}</div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}

function VariantCard({ letter, label, url, data, color, highlight }: { letter: string; label: string; url: string; data?: AbStats; color: string; highlight?: boolean }) {
  const d = data || { visitasHoy: 0, aperturasHoy: 0, pedidosHoy: 0, visitasTotal: 0, aperturasTotal: 0, pedidosTotal: 0, ingresos: 0 };
  const pct = (n: number, dn: number) => (dn ? ((n / dn) * 100).toFixed(1) + "%" : "—");
  return (
    <div className="card" style={{ borderColor: highlight ? "var(--brand)" : undefined, borderWidth: highlight ? 2 : 1 }}>
      <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>
          {letter}
        </div>
        <div style={{ flex: 1 }}>
          <div className="h2">Variante {letter}</div>
          <div className="muted" style={{ fontSize: 11 }}>{label}</div>
        </div>
        <code style={{ fontSize: 10, background: "var(--panel-sub)", padding: "3px 6px", borderRadius: 4 }}>{url}</code>
      </div>
      <div className="card-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <MiniStat n={d.visitasHoy} label="Visitas hoy" />
          <MiniStat n={d.aperturasHoy} label="Aperturas" sub={d.visitasHoy ? pct(d.aperturasHoy, d.visitasHoy) : "—"} />
          <MiniStat n={d.pedidosHoy} label="Pedidos hoy" sub={d.aperturasHoy ? pct(d.pedidosHoy, d.aperturasHoy) : "—"} />
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "grid", gap: 6, fontSize: 12.5 }}>
          <Row label="Ingresos rango" value={<strong className="num" style={{ color: "var(--success)" }}>{fmtCOP(d.ingresos)}</strong>} />
          <Row label="Visitas histórico" value={<strong className="num">{d.visitasTotal}</strong>} />
          <Row label="Pedidos histórico" value={<strong className="num">{d.pedidosTotal}</strong>} />
          <Row label="Conversión histórica" value={<strong className="num" style={{ color: "var(--warning)" }}>{d.visitasTotal ? pct(d.pedidosTotal, d.visitasTotal) : "—"}</strong>} />
        </div>
      </div>
    </div>
  );
}

// ============ TAB: ADS MANAGER ============
type CampaignRow = {
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
  frascos: number;
};

type AdsResp = {
  spend: number; impressions: number; clicks: number; purchases: number; value: number;
  roas: number; cpa: number; ctr: number; cpc: number;
  landingPageViews: number; initiateCheckout: number;
  frascos: number;
  campaigns: CampaignRow[]; note?: string; rango?: string; fuenteVentas?: string;
};

const RANGE_PRESETS: { id: string; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "yesterday", label: "Ayer" },
  { id: "last_7d", label: "Últimos 7 días" },
  { id: "last_14d", label: "Últimos 14 días" },
  { id: "last_30d", label: "Últimos 30 días" },
  { id: "this_month", label: "Este mes" },
  { id: "last_month", label: "Mes pasado" },
  { id: "maximum", label: "Todo el histórico" },
];

// ============ ADS MANAGER (Meta + TikTok) ============
function AdsManager() {
  const [subTab, setSubTab] = useState<"meta" | "tiktok">("meta");
  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-body" style={{ display: "flex", gap: 8, padding: "10px 14px" }}>
          <button
            onClick={() => setSubTab("meta")}
            className={`btn ${subTab === "meta" ? "primary" : ""}`}
            style={{ fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="fb" size={14} /> Meta Ads
          </button>
          <button
            onClick={() => setSubTab("tiktok")}
            className={`btn ${subTab === "tiktok" ? "primary" : ""}`}
            style={{ fontSize: 13, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}
          >
            <span style={{ fontWeight: 900, fontSize: 13 }}>TT</span> TikTok Ads
          </button>
        </div>
      </div>
      {subTab === "meta" && <MetaAdsTab />}
      {subTab === "tiktok" && <TikTokAdsTab />}
    </>
  );
}

type TikTokCampaignRow = {
  id: string; name: string; status: string;
  spend: number; impressions: number; clicks: number;
  ctr: number; cpc: number; cpm: number; reach: number;
  conversions: number; cpa: number; videoViews: number;
};
type TikTokAdsResp = {
  configured: boolean;
  spend: number; impressions: number; clicks: number; conversions: number;
  ctr: number; cpc: number; cpa: number; videoViews?: number;
  campaigns: TikTokCampaignRow[]; rango?: string; note?: string; message?: string;
};

function TikTokAdsTab() {
  const [data, setData] = useState<TikTokAdsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [preset, setPreset] = useState<string>("last_30d");
  const [customMode, setCustomMode] = useState(false);
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");

  function cargar() {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams();
    if (customMode && since && until) {
      params.set("since", since);
      params.set("until", until);
    } else {
      params.set("preset", preset);
    }
    fetch(`/api/admin/tiktok-ads?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setErr("No se pudo cargar TikTok Ads"); setLoading(false); });
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customMode, since, until]);

  const filtroBar = (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-body" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div className="label" style={{ marginRight: 4 }}>Rango:</div>
        {!customMode && RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setPreset(p.id); setCustomMode(false); }}
            className={`btn ${preset === p.id ? "primary" : ""}`}
            style={{ fontSize: 11, padding: "5px 10px" }}
          >
            {p.label}
          </button>
        ))}
        {customMode ? (
          <>
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4 }} />
            <span style={{ fontSize: 12 }}>→</span>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4 }} />
            <button onClick={() => { setCustomMode(false); setSince(""); setUntil(""); }} className="btn" style={{ fontSize: 11, padding: "5px 10px" }}>Cancelar</button>
          </>
        ) : (
          <button onClick={() => setCustomMode(true)} className="btn" style={{ fontSize: 11, padding: "5px 10px" }}>📅 Rango personalizado</button>
        )}
      </div>
    </div>
  );

  if (loading) return <>{filtroBar}<div className="card"><div className="card-body" style={{ padding: 40, textAlign: "center" }}>Cargando TikTok Ads…</div></div></>;

  if (err) {
    return (
      <>
        {filtroBar}
        <div className="card">
          <div className="card-body">
            <div style={{ color: "var(--text-sub)" }}>{err}</div>
          </div>
        </div>
      </>
    );
  }

  if (data && !data.configured) {
    return (
      <>
        {filtroBar}
        <div className="card">
          <div className="card-header"><div className="h2">⚠️ TikTok Business API no configurada</div></div>
          <div className="card-body">
            <p style={{ marginBottom: 12 }}>{data.message}</p>
            <div style={{ background: "var(--panel-sub)", padding: 14, borderRadius: 8, fontSize: 13 }}>
              <strong>Cómo configurar:</strong>
              <ol style={{ marginTop: 8, paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Ve a <a href="https://ads.tiktok.com/marketing_api/homepage" target="_blank" rel="noreferrer" style={{ color: "var(--brand-ink)" }}>TikTok Marketing API</a> y crea una app de Business API.</li>
                <li>Autoriza tu Ad Account para obtener un <code>access_token</code> de larga duración.</li>
                <li>Encuentra tu <strong>Advertiser ID</strong> en TikTok Ads Manager → Account info.</li>
                <li>Agrega a <code>.env</code> del landing:
                  <pre style={{ background: "#0a0a0a", color: "#e0e0e0", padding: 10, borderRadius: 6, marginTop: 6, fontSize: 11 }}>
TIKTOK_BUSINESS_TOKEN=tu_access_token{"\n"}TIKTOK_ADVERTISER_ID=tu_advertiser_id
                  </pre>
                </li>
                <li>Reinicia el servidor.</li>
              </ol>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!data) return null;
  const campaigns = data.campaigns ?? [];

  return (
    <>
      {filtroBar}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <Kpi label="Gasto" value={fmtCOP(data.spend || 0)} />
        <Kpi label="Impresiones" value={(data.impressions || 0).toLocaleString("es-CO")} />
        <Kpi label="Clicks" value={(data.clicks || 0).toLocaleString("es-CO")} />
        <Kpi label="CTR" value={(data.ctr || 0).toFixed(2) + "%"} />
        <Kpi label="CPC" value={fmtCOP(data.cpc || 0)} />
        <Kpi label="Conversiones" value={String(data.conversions || 0)} accent="success" />
      </div>

      <div className="card">
        <div className="card-header">
          <div className="h2">Campañas TikTok</div>
          <span className="muted" style={{ fontSize: 11 }}>{campaigns.length} campañas {data.rango ? `· ${data.rango}` : ""}</span>
        </div>
        <div className="card-body tight" style={{ overflowX: "auto" }}>
          {campaigns.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-sub)" }}>
              {data.note || "Sin datos en el rango seleccionado"}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Estado</th>
                  <th className="t-right">Gasto</th>
                  <th className="t-right">Impr</th>
                  <th className="t-right">Video Views</th>
                  <th className="t-right">Clicks</th>
                  <th className="t-right">CTR</th>
                  <th className="t-right">CPC</th>
                  <th className="t-right">Conv</th>
                  <th className="t-right">CPA</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div className="mono muted" style={{ fontSize: 10 }}>{c.id}</div>
                    </td>
                    <td><span className="pill">{c.status}</span></td>
                    <td className="t-right num">{fmtCOP(c.spend)}</td>
                    <td className="t-right num">{c.impressions.toLocaleString("es-CO")}</td>
                    <td className="t-right num">{c.videoViews.toLocaleString("es-CO")}</td>
                    <td className="t-right num">{c.clicks.toLocaleString("es-CO")}</td>
                    <td className="t-right num">{c.ctr.toFixed(2)}%</td>
                    <td className="t-right num">{fmtCOP(c.cpc)}</td>
                    <td className="t-right num"><strong>{c.conversions}</strong></td>
                    <td className="t-right num">{c.cpa > 0 ? fmtCOP(c.cpa) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function MetaAdsTab() {
  const [data, setData] = useState<AdsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [preset, setPreset] = useState<string>("last_30d");
  const [customMode, setCustomMode] = useState(false);
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");

  function cargar() {
    setLoading(true);
    setErr("");
    const params = new URLSearchParams();
    if (customMode && since && until) {
      params.set("since", since);
      params.set("until", until);
    } else {
      params.set("preset", preset);
    }
    fetch(`/api/admin/ads?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setErr("No se pudo cargar Meta Ads. Configura el token en /api/admin/ads."); setLoading(false); });
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customMode, since, until]);

  const filtroBar = (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-body" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div className="label" style={{ marginRight: 4 }}>Rango:</div>
        {!customMode && RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => { setPreset(p.id); setCustomMode(false); }}
            className={`btn ${preset === p.id ? "primary" : ""}`}
            style={{ fontSize: 11, padding: "5px 10px" }}
          >
            {p.label}
          </button>
        ))}
        {customMode ? (
          <>
            <input type="date" value={since} onChange={(e) => setSince(e.target.value)} style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4 }} />
            <span style={{ fontSize: 12 }}>→</span>
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={{ padding: "5px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 4 }} />
            <button onClick={() => { setCustomMode(false); setSince(""); setUntil(""); }} className="btn" style={{ fontSize: 11, padding: "5px 10px" }}>Cancelar</button>
          </>
        ) : (
          <button onClick={() => setCustomMode(true)} className="btn" style={{ fontSize: 11, padding: "5px 10px" }}>📅 Rango personalizado</button>
        )}
        {data?.fuenteVentas && <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>📊 Ventas: {data.fuenteVentas}</span>}
      </div>
    </div>
  );

  if (loading) return <>{filtroBar}<div className="card"><div className="card-body" style={{ padding: 40, textAlign: "center" }}>Cargando Meta Ads…</div></div></>;

  if (err || !data) {
    return (
      <>
        {filtroBar}
        <div className="card">
          <div className="card-header"><div className="h2"><Icon name="fb" size={14} /> Meta Ads</div></div>
          <div className="card-body">
            <div style={{ color: "var(--text-sub)", marginBottom: 12 }}>{err}</div>
          </div>
        </div>
      </>
    );
  }

  const campaigns = data.campaigns ?? [];
  // Agregados por variant
  const sumBy = (variant: "A" | "B") => campaigns.filter((c) => c.variant === variant).reduce(
    (acc, c) => ({
      spend: acc.spend + c.spend, impr: acc.impr + c.impressions, clicks: acc.clicks + c.clicks,
      lpv: acc.lpv + c.landingPageViews, ic: acc.ic + c.initiateCheckout, purchases: acc.purchases + c.purchases,
      value: acc.value + c.value,
    }), { spend: 0, impr: 0, clicks: 0, lpv: 0, ic: 0, purchases: 0, value: 0 }
  );
  const A = sumBy("A");
  const B = sumBy("B");
  const variantCard = (label: "A" | "B", v: typeof A, color: string) => (
    <div className="card">
      <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ flex: 1 }}>
          <div className="h2">CBO MI TIROIDES{label === "B" ? " #2" : ""}</div>
          <div className="muted" style={{ fontSize: 11 }}>Variante {label}</div>
        </div>
        <strong className="num" style={{ color: "var(--success)" }}>
          ROAS {v.spend > 0 ? (v.value / v.spend).toFixed(2) : "—"}x
        </strong>
      </div>
      <div className="card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <MiniStat n={v.impr} label="Impresiones" />
        <MiniStat n={v.clicks} label="Clicks" sub={v.impr ? ((v.clicks / v.impr) * 100).toFixed(2) + "%" : "—"} />
        <MiniStat n={v.lpv} label="Landing PV" sub={v.clicks ? ((v.lpv / v.clicks) * 100).toFixed(1) + "%" : "—"} />
        <MiniStat n={v.ic} label="Init checkout" sub={v.lpv ? ((v.ic / v.lpv) * 100).toFixed(1) + "%" : "—"} />
        <MiniStat n={v.purchases} label="Compras" sub={v.ic ? ((v.purchases / v.ic) * 100).toFixed(1) + "%" : "—"} />
        <MiniStat n={v.purchases > 0 ? Math.round(v.spend / v.purchases) : 0} label="CPA" sub={fmtCOP(v.spend)} />
      </div>
    </div>
  );

  return (
    <>
      {filtroBar}
      {/* KPIs agregados */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <Kpi label="Gasto" value={fmtCOP(data.spend || 0)} />
        <Kpi label="ROAS" value={(data.roas || 0).toFixed(2) + "x"} accent="success" />
        <Kpi label="CPA" value={fmtCOP(data.cpa || 0)} />
        <Kpi label="Compras" value={String(data.purchases || 0)} />
        <Kpi label="Frascos" value={String(data.frascos || 0)} />
        <Kpi label="CTR" value={(data.ctr || 0).toFixed(2) + "%"} />
      </div>

      {/* Embudo A vs B */}
      <h3 style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
        Embudo por variante
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
        {variantCard("A", A, "#635BFF")}
        {variantCard("B", B, "#0F3D2E")}
      </div>

      {/* Tabla de campañas con embudo completo */}
      <div className="card">
        <div className="card-header">
          <div className="h2">Campañas Meta Ads</div>
          <span className="muted" style={{ fontSize: 11 }}>{campaigns.length} campañas</span>
        </div>
        <div className="card-body tight" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Campaña</th>
                <th>Var</th>
                <th className="t-right">Gasto</th>
                <th className="t-right">Impr</th>
                <th className="t-right">Clicks</th>
                <th className="t-right">CTR</th>
                <th className="t-right">LPV</th>
                <th className="t-right">IC</th>
                <th className="t-right">Compras</th>
                <th className="t-right">Frascos</th>
                <th className="t-right">CPA</th>
                <th className="t-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div className="mono muted" style={{ fontSize: 10 }}>{c.id}</div>
                  </td>
                  <td>
                    <span className={`pill ${c.variant === "A" ? "accent" : c.variant === "B" ? "brand" : ""}`}>{c.variant}</span>
                  </td>
                  <td className="t-right num">{fmtCOP(c.spend)}</td>
                  <td className="t-right num">{c.impressions.toLocaleString("es-CO")}</td>
                  <td className="t-right num">{c.clicks.toLocaleString("es-CO")}</td>
                  <td className="t-right num">{c.ctr.toFixed(2)}%</td>
                  <td className="t-right num">{c.landingPageViews}</td>
                  <td className="t-right num">{c.initiateCheckout}</td>
                  <td className="t-right num"><strong>{c.purchases}</strong></td>
                  <td className="t-right num" style={{ color: "var(--brand-ink)" }}><strong>{c.frascos}</strong></td>
                  <td className="t-right num">{c.cpa > 0 ? fmtCOP(c.cpa) : "—"}</td>
                  <td className="t-right num" style={{ color: c.roas >= 1 ? "var(--success)" : "var(--text-muted)" }}>
                    <strong>{c.roas > 0 ? c.roas.toFixed(2) + "x" : "—"}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ============ COMPONENTES ============
function Kpi({ label, value, foot, icon, spark, accent }: { label: string; value: string; foot?: string; icon?: React.ReactNode; spark?: number[]; accent?: "success" | "warning" | "danger" }) {
  return (
    <div className="kpi">
      <div className="kpi-label">
        {icon}
        {label}
      </div>
      <div className="kpi-value" style={accent === "success" ? { color: "var(--success)" } : undefined}>{value}</div>
      <div className="kpi-foot">
        <span style={{ flex: 1 }}>{foot}</span>
        {spark && <Sparkline data={spark} color={accent === "success" ? "#16A34A" : "#0F3D2E"} />}
      </div>
    </div>
  );
}

function FunnelRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="num" style={{ color: "var(--text-sub)" }}>
          <strong style={{ color: "var(--text)" }}>{value.toLocaleString("es-CO")}</strong>
          {total ? <> · {pct.toFixed(1)}%</> : null}
        </span>
      </div>
      <div style={{ height: 8, background: "var(--panel-sub)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function StatPill({ label, n, variant }: { label: string; n: number; variant?: "warning" | "info" | "accent" | "success" | "danger" }) {
  return (
    <div style={{ background: "var(--panel-sub)", borderRadius: 8, padding: 12 }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="h1 num">{n}</div>
      {variant && <span className={`pill ${variant}`} style={{ marginTop: 6 }}>{label.toLowerCase()}</span>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value}</div>
    </div>
  );
}

function MiniStat({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div style={{ background: "var(--panel-sub)", borderRadius: 6, padding: 10, textAlign: "center" }}>
      <div className="num" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{n}</div>
      <div className="label" style={{ marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: "var(--warning)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="muted">{label}</span>
      {value}
    </div>
  );
}

function LiveUsersBar() {
  const [data, setData] = useState<{ active: number; viewsLastMin: number; users5min: number } | null>(null);

  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch("/api/admin/live", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setData(j);
      } catch { /* no-op */ }
    }
    tick();
    const t = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const active = data?.active ?? 0;
  const live = active > 0;

  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        borderLeft: `3px solid ${live ? "var(--success)" : "var(--border)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          className="dot pulse"
          style={{
            width: 10,
            height: 10,
            background: live ? "var(--success)" : "var(--text-muted)",
            display: "inline-block",
            borderRadius: 5,
          }}
        />
        <div>
          <div className="label">En este momento</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="num" style={{ fontSize: 24, fontWeight: 700, color: live ? "var(--success)" : "var(--text)" }}>
              {active}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-sub)" }}>
              {active === 1 ? "persona viendo el landing" : "personas viendo el landing"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
        <div style={{ textAlign: "right" }}>
          <div className="label">Vistas último minuto</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{data?.viewsLastMin ?? 0}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="label">Usuarios últimos 5 min</div>
          <div className="num" style={{ fontSize: 16, fontWeight: 600 }}>{data?.users5min ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
