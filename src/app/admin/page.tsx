"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

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

const ESTADOS: Pedido["estado"][] = ["nuevo", "confirmado", "despachado", "entregado", "cancelado"];

const COLORES_ESTADO: Record<Pedido["estado"], { bg: string; fg: string }> = {
  nuevo: { bg: "#fff7e6", fg: "#b25d00" },
  confirmado: { bg: "#e6f3ff", fg: "#0a4d99" },
  despachado: { bg: "#f0e6ff", fg: "#5a2ca0" },
  entregado: { bg: "#e6ffed", fg: "#1f7a3a" },
  cancelado: { bg: "#fde2e2", fg: "#a01919" },
};

function fmtCOP(n: number) {
  return "$" + n.toLocaleString("es-CO");
}
function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
}
// Convierte ISO UTC a YYYY-MM-DD en hora Bogotá
function fechaBogota(iso: string): string {
  const d = new Date(iso);
  const bogota = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  return bogota.toISOString().slice(0, 10);
}
// Hoy en hora Bogotá (YYYY-MM-DD)
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
function fmtRangoLabel(from: string, to: string): string {
  if (from === to) {
    return new Date(from + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  }
  const fa = new Date(from + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  const fb = new Date(to + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
  return `${fa} → ${fb}`;
}

type PresetRango = { label: string; from: string; to: string };
function presetsRango(): PresetRango[] {
  const hoy = hoyBogota();
  return [
    { label: "Hoy", from: hoy, to: hoy },
    { label: "Ayer", from: diasAtrasBogota(1), to: diasAtrasBogota(1) },
    { label: "Últimos 7 días", from: diasAtrasBogota(6), to: hoy },
    { label: "Últimos 14 días", from: diasAtrasBogota(13), to: hoy },
    { label: "Últimos 30 días", from: diasAtrasBogota(29), to: hoy },
    { label: "Este mes", from: hoy.slice(0, 7) + "-01", to: hoy },
    { label: "Máximo", from: "2026-01-01", to: hoy },
  ];
}

export default function AdminPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | Pedido["estado"]>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<Pedido | null>(null);
  const [error, setError] = useState("");
  // Rango de fechas (default = hoy en Bogotá)
  const [from, setFrom] = useState<string>(hoyBogota());
  const [to, setTo] = useState<string>(hoyBogota());
  const [showPicker, setShowPicker] = useState(false);

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
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

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

  const filtrados = useMemo(() => {
    return pedidos.filter((p) => {
      if (filtro !== "todos" && p.estado !== filtro) return false;
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
  }, [pedidos, filtro, busqueda]);

  // Pedidos del rango filtrado (en hora Bogotá): respeta from/to
  const pedidosRango = pedidos.filter((p) => {
    const fp = fechaBogota(p.creadoEn);
    return fp >= from && fp <= to && p.estado !== "cancelado";
  });
  const ingresosRango = pedidosRango.reduce((a, p) => a + p.total, 0);
  const ticketProm = pedidos.length ? Math.round((stats?.ingresosTotales || 0) / Math.max(1, pedidos.filter((p) => p.estado !== "cancelado").length)) : 0;
  const presets = presetsRango();
  const presetActivo = presets.find((p) => p.from === from && p.to === to);
  const labelRango = presetActivo ? presetActivo.label : fmtRangoLabel(from, to);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f7", fontFamily: "-apple-system, system-ui, sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e1e3e5", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>🌿</span>
          <strong style={{ fontSize: 16, color: "#202223" }}>MI TIROIDES — Admin</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={cargar} style={btnSec}>Actualizar</button>
          <button onClick={logout} style={btnSec}>Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
        {error && <div style={{ background: "#fde2e2", color: "#a01919", padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

        {/* DATE RANGE PICKER estilo Meta */}
        <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: 10, padding: 14, marginBottom: 20, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6d7175", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
                Rango (hora Colombia)
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#1f3d2b" }}>📅 {labelRango}</div>
            </div>
            <button onClick={() => setShowPicker((s) => !s)} style={{ ...btnSec, padding: "10px 16px", fontWeight: 600 }}>
              {showPicker ? "Cerrar" : "Cambiar rango ▾"}
            </button>
          </div>

          {showPicker && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f2f3", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 8, fontWeight: 600 }}>Presets</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {presets.map((p) => {
                    const active = p.from === from && p.to === to;
                    return (
                      <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); setShowPicker(false); }}
                        style={{
                          textAlign: "left", padding: "8px 12px",
                          border: `1px solid ${active ? "#1f3d2b" : "#e1e3e5"}`,
                          background: active ? "#1f3d2b" : "#fff",
                          color: active ? "#fff" : "#202223",
                          borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500,
                        }}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 8, fontWeight: 600 }}>Personalizado</div>
                <label style={{ display: "block", fontSize: 12, color: "#6d7175", marginBottom: 4 }}>Desde</label>
                <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #c9cccf", borderRadius: 6, fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
                <label style={{ display: "block", fontSize: 12, color: "#6d7175", marginBottom: 4 }}>Hasta</label>
                <input type="date" value={to} min={from} max={hoyBogota()} onChange={(e) => setTo(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #c9cccf", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
                <button onClick={() => setShowPicker(false)} style={{ ...btnSec, marginTop: 12, width: "100%", background: "#1f3d2b", color: "#fff", borderColor: "#1f3d2b", fontWeight: 600 }}>
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Métricas — embudo del rango */}
        <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#6d7175", textTransform: "uppercase", letterSpacing: 0.6 }}>
          Embudo · {labelRango}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
          <Metric label="👁️ Visitas" value={String(stats?.visitasHoy ?? 0)} />
          <Metric label="📝 Abrieron form" value={String(stats?.aperturasHoy ?? 0)} sub={stats?.visitasHoy ? `${pct(stats.aperturasHoy ?? 0, stats.visitasHoy)} de visitas` : undefined} />
          <Metric label="🛒 Pedidos" value={String(pedidosRango.length)} sub={stats?.aperturasHoy ? `${pct(pedidosRango.length, stats.aperturasHoy ?? 0)} de aperturas` : undefined} />
          <Metric label="💰 Ingresos" value={fmtCOP(ingresosRango)} />
        </div>

        <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#6d7175", textTransform: "uppercase", letterSpacing: 0.6 }}>Totales históricos</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <Metric label="Visitas histórico" value={String(stats?.visitasTotal ?? 0)} />
          <Metric label="Aperturas histórico" value={String(stats?.aperturasTotal ?? 0)} />
          <Metric label="Total pedidos" value={String(stats?.total ?? 0)} />
          <Metric label="Ticket promedio" value={fmtCOP(ticketProm)} />
          <Metric label="Por confirmar" value={String(stats?.nuevos ?? 0)} highlight={(stats?.nuevos ?? 0) > 0} />
        </div>

        {/* A/B Testing comparativo */}
        {stats?.ab && (
          <>
            <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#6d7175", textTransform: "uppercase", letterSpacing: 0.6 }}>
              🧪 A/B Testing — Variante A (precios actuales) vs B (2 y 3 frascos +$20k) · {labelRango}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, marginBottom: 24 }}>
              <AbCard label="A · 1f $89.9k · 2f $119.9k · 3f $139.9k" url="/" data={stats.ab.v1} />
              <AbCard label="B · 1f $89.9k · 2f $139.9k · 3f $169.9k" url="/v2" data={stats.ab.v2} highlight />
            </div>
          </>
        )}

        {/* Filtros */}
        <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <FiltroBtn active={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos ({pedidos.length})</FiltroBtn>
            {ESTADOS.map((e) => (
              <FiltroBtn key={e} active={filtro === e} onClick={() => setFiltro(e)}>
                {e.charAt(0).toUpperCase() + e.slice(1)} ({(stats?.[(e + "s") as keyof Stats] as number | undefined) ?? 0})
              </FiltroBtn>
            ))}
          </div>
          <input
            placeholder="🔍 Buscar por nombre, teléfono, ID o ciudad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: "1px solid #c9cccf", borderRadius: 8, fontSize: 14, boxSizing: "border-box" }}
          />
        </div>

        {/* Tabla */}
        <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: 10, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#6d7175" }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#6d7175" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
              <div>No hay pedidos {filtro !== "todos" ? `en estado "${filtro}"` : "todavía"}</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f6f6f7", borderBottom: "1px solid #e1e3e5" }}>
                  <Th>Pedido</Th>
                  <Th>Fecha</Th>
                  <Th>Cliente</Th>
                  <Th>Ciudad</Th>
                  <Th>Frascos</Th>
                  <Th>Total</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f2f3" }}>
                    <Td><code style={{ fontSize: 12, color: "#5c5f62" }}>{p.id}</code></Td>
                    <Td>{fmtFecha(p.creadoEn)}</Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ fontSize: 12, color: "#6d7175" }}>{p.telefonoCliente}</div>
                    </Td>
                    <Td>{p.ciudad}{p.departamento ? `, ${p.departamento}` : ""}</Td>
                    <Td>{p.cantidad}</Td>
                    <Td><strong>{fmtCOP(p.total)}</strong></Td>
                    <Td><EstadoBadge estado={p.estado} /></Td>
                    <Td>
                      <button onClick={() => setSeleccionado(p)} style={btnSec}>Ver</button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Modal detalle */}
      {seleccionado && (
        <div onClick={() => setSeleccionado(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, maxWidth: 560, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ padding: 20, borderBottom: "1px solid #e1e3e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#6d7175" }}>Pedido</div>
                <strong style={{ fontSize: 18 }}>{seleccionado.id}</strong>
              </div>
              <button onClick={() => setSeleccionado(null)} style={{ background: "transparent", border: 0, fontSize: 24, cursor: "pointer", color: "#6d7175" }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              <Field label="Cliente" value={seleccionado.nombre} />
              <Field label="Teléfono" value={
                <a href={`https://wa.me/${seleccionado.telefonoCliente}`} target="_blank" style={{ color: "#1f7a3a", textDecoration: "none" }}>
                  {seleccionado.telefonoCliente} 💬 WhatsApp
                </a>
              } />
              <Field label="Dirección" value={`${seleccionado.direccion}, ${seleccionado.ciudad}${seleccionado.departamento ? ", " + seleccionado.departamento : ""}`} />
              {seleccionado.referencia && <Field label="Referencia" value={seleccionado.referencia} />}
              <Field label="Frascos" value={`${seleccionado.cantidad} (${seleccionado.diasTratamiento} días)`} />
              <Field label="Total" value={<strong>{fmtCOP(seleccionado.total)}</strong>} />
              <Field label="Creado" value={fmtFecha(seleccionado.creadoEn)} />
              <Field label="Estado actual" value={<EstadoBadge estado={seleccionado.estado} />} />

              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #e1e3e5" }}>
                <div style={{ fontSize: 13, color: "#6d7175", marginBottom: 8 }}>Cambiar estado:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ESTADOS.map((e) => (
                    <button key={e} onClick={() => cambiarEstado(seleccionado.id, e)} disabled={seleccionado.estado === e}
                      style={{
                        padding: "8px 14px",
                        border: 0,
                        borderRadius: 6,
                        cursor: seleccionado.estado === e ? "default" : "pointer",
                        background: seleccionado.estado === e ? "#1f3d2b" : "#f6f6f7",
                        color: seleccionado.estado === e ? "#fff" : "#202223",
                        fontSize: 13,
                        fontWeight: 500,
                      }}>
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button onClick={() => {
                  const txt = `${seleccionado.nombre}\n${seleccionado.telefonoCliente}\n${seleccionado.direccion}\n${seleccionado.ciudad}${seleccionado.departamento ? ", " + seleccionado.departamento : ""}\n${seleccionado.cantidad} frasco(s) - ${fmtCOP(seleccionado.total)}`;
                  navigator.clipboard.writeText(txt);
                  alert("Copiado para guía de envío");
                }} style={btnSec}>📋 Copiar para guía de envío</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnSec: React.CSSProperties = {
  padding: "8px 14px",
  border: "1px solid #c9cccf",
  borderRadius: 6,
  background: "#fff",
  color: "#202223",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "#6d7175", textTransform: "uppercase", letterSpacing: 0.4 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "12px 16px", verticalAlign: "top" }}>{children}</td>;
}
function Metric({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${highlight ? "#b25d00" : "#e1e3e5"}`, borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: highlight ? "#b25d00" : "#202223" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#6d7175", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}
function pct(num: number, den: number) {
  if (!den) return "0%";
  return ((num / den) * 100).toFixed(1) + "%";
}

function AbCard({ label, url, data, highlight }: { label: string; url: string; data?: AbStats; highlight?: boolean }) {
  const d = data || { visitasHoy: 0, aperturasHoy: 0, pedidosHoy: 0, visitasTotal: 0, aperturasTotal: 0, pedidosTotal: 0, ingresos: 0 };
  return (
    <div style={{ background: "#fff", border: `2px solid ${highlight ? "#1f3d2b" : "#e1e3e5"}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong style={{ fontSize: 15, color: "#202223" }}>{label}</strong>
        <code style={{ fontSize: 11, background: "#f6f6f7", padding: "3px 8px", borderRadius: 4 }}>{url}</code>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <MiniStat n={d.visitasHoy} label="Visitas" />
        <MiniStat n={d.aperturasHoy} label="Aperturas" sub={d.visitasHoy ? pct(d.aperturasHoy, d.visitasHoy) : "—"} />
        <MiniStat n={d.pedidosHoy} label="Pedidos" sub={d.aperturasHoy ? pct(d.pedidosHoy, d.aperturasHoy) : "—"} />
      </div>
      <div style={{ borderTop: "1px solid #f1f2f3", paddingTop: 10, fontSize: 13, color: "#6d7175" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Ingresos rango</span><strong style={{ color: "#1f7a3a" }}>{fmtCOP(d.ingresos)}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Visitas histórico</span><strong style={{ color: "#202223" }}>{d.visitasTotal}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Pedidos histórico</span><strong style={{ color: "#202223" }}>{d.pedidosTotal}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e1e3e5" }}>
          <span>Conversión histórica (visita → pedido)</span>
          <strong style={{ color: "#b25d00" }}>{d.visitasTotal ? pct(d.pedidosTotal, d.visitasTotal) : "—"}</strong>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div style={{ background: "#f6f6f7", borderRadius: 8, padding: 10, textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#202223", lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11, color: "#6d7175", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#b25d00", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function FiltroBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px",
      borderRadius: 20,
      border: 0,
      background: active ? "#1f3d2b" : "#f1f2f3",
      color: active ? "#fff" : "#202223",
      fontSize: 13,
      fontWeight: 500,
      cursor: "pointer",
    }}>{children}</button>
  );
}
function EstadoBadge({ estado }: { estado: Pedido["estado"] }) {
  const c = COLORES_ESTADO[estado];
  return <span style={{ background: c.bg, color: c.fg, padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{estado}</span>;
}
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#6d7175", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#202223" }}>{value}</div>
    </div>
  );
}
