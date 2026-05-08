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
  visitasTotal?: number;
  aperturasTotal?: number;
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

export default function AdminPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | Pedido["estado"]>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<Pedido | null>(null);
  const [error, setError] = useState("");

  async function cargar() {
    const r = await fetch("/api/admin/pedidos", { cache: "no-store" });
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

  const hoyISO = new Date().toISOString().slice(0, 10);
  const pedidosHoy = pedidos.filter((p) => p.creadoEn.slice(0, 10) === hoyISO && p.estado !== "cancelado");
  const ingresosHoy = pedidosHoy.reduce((a, p) => a + p.total, 0);
  const ticketProm = pedidos.length ? Math.round((stats?.ingresosTotales || 0) / Math.max(1, pedidos.filter((p) => p.estado !== "cancelado").length)) : 0;

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

        {/* Métricas — embudo */}
        <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#6d7175", textTransform: "uppercase", letterSpacing: 0.6 }}>Embudo de hoy</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
          <Metric label="👁️ Visitas hoy" value={String(stats?.visitasHoy ?? 0)} />
          <Metric label="📝 Abrieron form" value={String(stats?.aperturasHoy ?? 0)} sub={stats?.visitasHoy ? `${pct(stats.aperturasHoy ?? 0, stats.visitasHoy)} de visitas` : undefined} />
          <Metric label="🛒 Pedidos hoy" value={String(pedidosHoy.length)} sub={stats?.aperturasHoy ? `${pct(pedidosHoy.length, stats.aperturasHoy ?? 0)} de aperturas` : undefined} />
          <Metric label="💰 Ingresos hoy" value={fmtCOP(ingresosHoy)} />
        </div>

        <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#6d7175", textTransform: "uppercase", letterSpacing: 0.6 }}>Totales</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <Metric label="Visitas total" value={String(stats?.visitasTotal ?? 0)} />
          <Metric label="Aperturas total" value={String(stats?.aperturasTotal ?? 0)} />
          <Metric label="Total pedidos" value={String(stats?.total ?? 0)} />
          <Metric label="Ingresos totales" value={fmtCOP(stats?.ingresosTotales ?? 0)} />
          <Metric label="Ticket promedio" value={fmtCOP(ticketProm)} />
          <Metric label="Por confirmar" value={String(stats?.nuevos ?? 0)} highlight={(stats?.nuevos ?? 0) > 0} />
        </div>

        {/* Filtros */}
        <div style={{ background: "#fff", border: "1px solid #e1e3e5", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <FiltroBtn active={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos ({pedidos.length})</FiltroBtn>
            {ESTADOS.map((e) => (
              <FiltroBtn key={e} active={filtro === e} onClick={() => setFiltro(e)}>
                {e.charAt(0).toUpperCase() + e.slice(1)} ({stats?.[(e + "s") as keyof Stats] ?? 0})
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
