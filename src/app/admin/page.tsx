"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import "./pira-admin.css";
import { CRM } from "./tabs/crm";
import { Pipeline } from "./tabs/pipeline";
import { Shipping } from "./tabs/shipping";
import { Products } from "./tabs/products";

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
};

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

type TabId = "dashboard" | "live" | "ab" | "ads" | "crm" | "pipeline" | "shipping" | "products";

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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [from, setFrom] = useState<string>(hoyBogota());
  const [to, setTo] = useState<string>(hoyBogota());
  const [seleccionado, setSeleccionado] = useState<Pedido | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | Pedido["estado"]>("todos");
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
  }, [pedidos, filtroEstado, busqueda]);

  // Top ciudades
  const topCiudades = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pedidosRango) {
      const k = p.ciudad || "—";
      map.set(k, (map.get(k) || 0) + p.cantidad);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [pedidosRango]);

  const presetActivo = presetsRango().find((p) => p.from === from && p.to === to);

  const TABS: { id: TabId; label: string; icon: string; group: string; badge?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: "home", group: "Operación" },
    { id: "live", label: "Pedidos en vivo", icon: "activity", group: "Operación", badge: unreadTotal },
    { id: "pipeline", label: "Pipeline pedidos", icon: "activity", group: "Operación" },
    { id: "ab", label: "A/B Testing", icon: "flask", group: "Crecimiento" },
    { id: "ads", label: "Ads Manager", icon: "target", group: "Crecimiento" },
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

          {activeTab === "shipping" && <Shipping />}

          {activeTab === "products" && <Products />}
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
  pedidos: Pedido[];
  onVerPedido: (p: Pedido) => void;
}) {
  const pct = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) + "%" : "0%");
  const visitas = stats?.visitasHoy ?? 0;
  const aperturas = stats?.aperturasHoy ?? 0;

  return (
    <>
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
  estadosCounts,
  paused,
  setPaused,
  onVerPedido,
}: {
  pedidos: Pedido[];
  loading: boolean;
  filtroEstado: "todos" | Pedido["estado"];
  setFiltroEstado: (e: "todos" | Pedido["estado"]) => void;
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
                  <th className="t-right">Frascos</th>
                  <th className="t-right">Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="row-clickable" onClick={() => onVerPedido(p)}>
                    <td className="mono" style={{ fontSize: 11, color: "var(--text-sub)" }}>{p.id}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{fmtFecha(p.creadoEn)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{p.telefonoCliente}</div>
                    </td>
                    <td>{p.ciudad}{p.departamento ? `, ${p.departamento}` : ""}</td>
                    <td className="t-right num">{p.cantidad}</td>
                    <td className="t-right num"><strong>{fmtCOP(p.total)}</strong></td>
                    <td><span className={`pill ${PILL_ESTADO[p.estado]}`}>{p.estado}</span></td>
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
function AdsManager() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/admin/ads", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setErr("No se pudo cargar Meta Ads. Configura el token en /api/admin/ads."); setLoading(false); });
  }, []);

  if (loading) return <div className="card"><div className="card-body" style={{ padding: 40, textAlign: "center" }}>Cargando Meta Ads…</div></div>;

  if (err) {
    return (
      <div className="card">
        <div className="card-header"><div className="h2"><Icon name="fb" size={14} /> Meta Ads</div></div>
        <div className="card-body">
          <div style={{ color: "var(--text-sub)", marginBottom: 12 }}>{err}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            Para activar esta pestaña, crea <code className="mono">/api/admin/ads</code> con el endpoint de Meta Marketing API usando las env vars:
          </div>
          <pre className="mono" style={{ background: "var(--panel-sub)", padding: 12, borderRadius: 6, fontSize: 11, marginTop: 8 }}>
{`META_ACCESS_TOKEN=...
META_AD_ACCOUNT_ID=act_598280937285029`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <Kpi label="Gasto" value={fmtCOP(data.spend || 0)} />
        <Kpi label="ROAS" value={(data.roas || 0).toFixed(2) + "x"} accent="success" />
        <Kpi label="CPA" value={fmtCOP(data.cpa || 0)} />
        <Kpi label="Compras" value={String(data.purchases || 0)} />
        <Kpi label="CTR" value={(data.ctr || 0).toFixed(2) + "%"} />
        <Kpi label="CPC" value={fmtCOP(data.cpc || 0)} />
      </div>
      {data.note && <div className="card"><div className="card-body muted">{data.note}</div></div>}
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
