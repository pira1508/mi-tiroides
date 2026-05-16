"use client";

import { useEffect, useState, useRef } from "react";

type PipelineOrder = {
  id: string;
  customer: string;
  phone: string;
  city: string;
  departamento?: string;
  direccion?: string;
  referencia?: string;
  guia?: string;
  transportadora?: string;
  novedadResolucion?: string;
  carrier: "hoko" | "envia" | "interrap" | "—";
  stage: "nuevo" | "confirmado" | "subido_hoko" | "guia_generada" | "guia_activa" | "en_bodega" | "espera_ruta" | "mercancia_recogida" | "en_reparto" | "entregado" | "pagado" | "novedad" | "novedad_resuelta" | "devolucion" | "cancelado";
  total: number;
  cantidad: number;
  diasTratamiento?: number;
  creadoEn?: string;
};

type Message = { from: "bot" | "cliente"; text: string; time: string };

const CARRIERS = {
  hoko: { name: "Hoko Envíos", color: "#635BFF" },
  envia: { name: "Envía", color: "#0284C7" },
  interrap: { name: "Interrapidísimo", color: "#D97706" },
};

// Estados alineados con Hoko: labels y orden idénticos al panel de Hoko
const STAGES: { id: PipelineOrder["stage"]; label: string; color: string; estadoBot: string }[] = [
  { id: "nuevo",             label: "Nuevo",              color: "#D97706", estadoBot: "nuevo" },
  { id: "confirmado",        label: "Confirmado",         color: "#0284C7", estadoBot: "confirmado" },
  { id: "subido_hoko",       label: "Creado en Hoko",     color: "#0EA5E9", estadoBot: "subido_hoko" },
  { id: "guia_generada",     label: "Guía generada",      color: "#06B6D4", estadoBot: "guia_generada" },
  { id: "guia_activa",       label: "Guía activa",        color: "#635BFF", estadoBot: "guia_activa" },
  { id: "en_bodega",         label: "En bodega",          color: "#7C3AED", estadoBot: "en_bodega" },
  { id: "espera_ruta",       label: "En espera de ruta",  color: "#A855F7", estadoBot: "espera_ruta" },
  { id: "mercancia_recogida",label: "Mercancía recogida", color: "#0F3D2E", estadoBot: "despachado" },
  { id: "en_reparto",        label: "En reparto",         color: "#DB2777", estadoBot: "en_reparto" },
  { id: "novedad",           label: "Novedad",            color: "#DC2626", estadoBot: "novedad" },
  { id: "novedad_resuelta",  label: "Novedad resuelta",   color: "#F59E0B", estadoBot: "novedad_resuelta" },
  { id: "entregado",         label: "Entregado",          color: "#16A34A", estadoBot: "entregado" },
  { id: "pagado",            label: "Pagado",             color: "#15803D", estadoBot: "pagado" },
  { id: "devolucion",        label: "Devolución",         color: "#94A3B8", estadoBot: "devolucion" },
  { id: "cancelado",         label: "Cancelado",          color: "#64748B", estadoBot: "cancelado" },
];

function mapStage(estado: string, novedadResolucion?: string | null): PipelineOrder["stage"] {
  if (estado === "despachado") return "mercancia_recogida";
  if (estado === "en_ruta") return "en_reparto";
  if (estado === "devuelto") return "devolucion";
  if (estado === "pagado_tienda") return "pagado";
  // Pedido que tuvo novedad y se resolvió (cliente respondió o se cerró el caso)
  // queda en una columna aparte para ver claramente las novedades activas vs resueltas.
  if (estado === "novedad" && novedadResolucion) return "novedad_resuelta";
  // estados directos del bot que coinciden 1:1 con STAGES
  return (estado as PipelineOrder["stage"]) || "nuevo";
}

function mapCarrier(transportadora?: string): PipelineOrder["carrier"] {
  const t = (transportadora || "").toLowerCase();
  if (t.includes("hoko")) return "hoko";
  if (t.includes("env")) return "envia";
  if (t.includes("inter")) return "interrap";
  return "—";
}

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

type DateRange =
  | "hoy"
  | "ayer"
  | "7d"
  | "14d"
  | "30d"
  | "este_mes"
  | "mes_pasado"
  | "todo"
  | "custom";

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
    case "7d": { const s = new Date(inicioHoy); s.setDate(s.getDate() - 7); return { since: s, until: finHoy }; }
    case "14d": { const s = new Date(inicioHoy); s.setDate(s.getDate() - 14); return { since: s, until: finHoy }; }
    case "30d": { const s = new Date(inicioHoy); s.setDate(s.getDate() - 30); return { since: s, until: finHoy }; }
    case "este_mes": {
      const s = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      return { since: s, until: finHoy };
    }
    case "mes_pasado": {
      const s = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const e = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59, 999);
      return { since: s, until: e };
    }
    case "custom": {
      if (!customSince || !customUntil) return { since: null, until: null };
      const s = new Date(customSince + "T00:00:00");
      const e = new Date(customUntil + "T23:59:59");
      return { since: s, until: e };
    }
    default: return { since: null, until: null };
  }
}

const RANGE_PRESETS: { id: DateRange; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "hoy", label: "Hoy" },
  { id: "ayer", label: "Ayer" },
  { id: "7d", label: "7 días" },
  { id: "14d", label: "14 días" },
  { id: "30d", label: "30 días" },
  { id: "este_mes", label: "Este mes" },
  { id: "mes_pasado", label: "Mes pasado" },
];

export function Pipeline() {
  const [orders, setOrders] = useState<PipelineOrder[]>([]);
  const [filterCarrier, setFilterCarrier] = useState<"todas" | keyof typeof CARRIERS>("todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openOrder, setOpenOrder] = useState<PipelineOrder | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("todo");
  const [customSince, setCustomSince] = useState<string>("");
  const [customUntil, setCustomUntil] = useState<string>("");

  async function cargar() {
    try {
      const r = await fetch("/api/admin/pedidos", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      const mapped: PipelineOrder[] = (data.pedidos || []).map((p: {id:string;nombre:string;telefonoCliente:string;ciudad:string;departamento?:string;direccion?:string;referencia?:string;cantidad:number;diasTratamiento?:number;total:number;estado:string;guia?:string;transportadora?:string;creadoEn?:string;novedadResolucion?:string|null}) => ({
        id: p.id,
        customer: p.nombre || "—",
        phone: p.telefonoCliente || "",
        city: p.ciudad || "—",
        departamento: p.departamento,
        direccion: p.direccion,
        referencia: p.referencia,
        guia: p.guia,
        transportadora: p.transportadora,
        novedadResolucion: p.novedadResolucion || undefined,
        carrier: mapCarrier(p.transportadora),
        stage: mapStage(p.estado, p.novedadResolucion),
        total: p.total,
        cantidad: p.cantidad,
        diasTratamiento: p.diasTratamiento,
        creadoEn: p.creadoEn,
      }));
      setOrders(mapped);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, []);

  async function moverPedido(id: string, nuevaEtapa: PipelineOrder["stage"]) {
    const stage = STAGES.find((s) => s.id === nuevaEtapa);
    if (!stage) return;
    // Optimista: lo movemos en UI primero
    setOrders((curr) => curr.map((o) => (o.id === id ? { ...o, stage: nuevaEtapa } : o)));
    // PATCH al backend
    const r = await fetch("/api/admin/pedidos", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, estado: stage.estadoBot }),
    });
    if (!r.ok) {
      // revertir y recargar si falló
      await cargar();
    }
  }

  // Filtro por rango de fechas (sobre creadoEn)
  const { since: dSince, until: dUntil } = rangoToFechas(dateRange, customSince, customUntil);
  const byDate = (dSince && dUntil)
    ? orders.filter((o) => {
        if (!o.creadoEn) return false;
        const t = new Date(o.creadoEn).getTime();
        return t >= dSince.getTime() && t <= dUntil.getTime();
      })
    : orders;

  const byCarrier = filterCarrier === "todas" ? byDate : byDate.filter((o) => o.carrier === filterCarrier);
  const q = search.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const filtered = q
    ? byCarrier.filter((o) => {
        const nombre = (o.customer || "").toLowerCase();
        const tel = (o.phone || "").toLowerCase();
        const telDigits = tel.replace(/\D/g, "");
        const guia = (o.guia || "").toLowerCase();
        return (
          nombre.includes(q) ||
          tel.includes(q) ||
          (qDigits.length > 0 && telDigits.includes(qDigits)) ||
          guia.includes(q)
        );
      })
    : byCarrier;

  // Eficiencia por transportadora (sobre el rango filtrado, ignora búsqueda textual)
  type CarrierStats = { total: number; entregadas: number; devueltas: number; novedades: number; enCamino: number };
  const carrierStats: Record<string, CarrierStats> = {};
  for (const carr of [...Object.keys(CARRIERS), "—"] as Array<keyof typeof CARRIERS | "—">) {
    carrierStats[carr] = { total: 0, entregadas: 0, devueltas: 0, novedades: 0, enCamino: 0 };
  }
  for (const o of byDate) {
    const s = carrierStats[o.carrier];
    if (!s) continue;
    s.total++;
    if (o.stage === "entregado" || o.stage === "pagado") s.entregadas++;
    else if (o.stage === "devolucion") s.devueltas++;
    else if (o.stage === "novedad") s.novedades++;
    else if (["mercancia_recogida","en_reparto","en_bodega","espera_ruta","guia_activa","guia_generada"].includes(o.stage)) s.enCamino++;
  }

  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent, stageId: PipelineOrder["stage"]) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    if (!id) return;
    const orden = orders.find((o) => o.id === id);
    if (!orden || orden.stage === stageId) return;
    moverPedido(id, stageId);
  }

  // Flow rail = mismos stages del kanban en orden
  const STAGES_FLOW: PipelineOrder["stage"][] = STAGES.map((s) => s.id);

  return (
    <>
      {/* Filtro de fechas */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="label" style={{ marginRight: 4 }}>📅 Rango:</span>
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setDateRange(p.id)}
              className={`btn ${dateRange === p.id ? "primary" : ""}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setDateRange("custom")}
            className={`btn ${dateRange === "custom" ? "primary" : ""}`}
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            Personalizado
          </button>
          {dateRange === "custom" && (
            <>
              <input type="date" value={customSince} onChange={(e) => setCustomSince(e.target.value)} style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4 }} />
              <span style={{ fontSize: 11 }}>→</span>
              <input type="date" value={customUntil} onChange={(e) => setCustomUntil(e.target.value)} style={{ padding: "4px 8px", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4 }} />
            </>
          )}
          <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>
            {byDate.length} pedidos en rango
          </span>
        </div>
      </div>

      {/* Eficiencia por transportadora */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-header">
          <div className="h2">📦 Eficiencia por transportadora</div>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            {(["hoko", "envia", "interrap", "—"] as const).map((k) => {
              const s = carrierStats[k];
              if (!s || s.total === 0) return null;
              const label = k === "—" ? "Sin transportadora" : CARRIERS[k as keyof typeof CARRIERS].name;
              const color = k === "—" ? "#64748B" : CARRIERS[k as keyof typeof CARRIERS].color;
              const cerradas = s.entregadas + s.devueltas;
              const tasaEntrega = cerradas ? Math.round((s.entregadas / cerradas) * 100) : 0;
              return (
                <div key={k} style={{ background: "var(--panel-sub)", padding: 10, borderRadius: 6, borderTop: `3px solid ${color}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                    Total: <strong>{s.total}</strong> · En camino: <strong>{s.enCamino}</strong>
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                    ✅ Entregadas: <strong style={{ color: "#16A34A" }}>{s.entregadas}</strong>
                    {" · "}
                    🚨 Novedades: <strong style={{ color: "#DC2626" }}>{s.novedades}</strong>
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                    ↩️ Devueltas: <strong style={{ color: "#94A3B8" }}>{s.devueltas}</strong>
                  </div>
                  {cerradas > 0 && (
                    <div style={{ fontSize: 11, lineHeight: 1.6, marginTop: 4, paddingTop: 4, borderTop: "1px dashed var(--border)" }}>
                      Tasa entrega: <strong style={{ color: tasaEntrega >= 80 ? "#16A34A" : tasaEntrega >= 60 ? "#F59E0B" : "#DC2626" }}>{tasaEntrega}%</strong>
                      {" · "}
                      Tasa devolución: <strong style={{ color: (100-tasaEntrega) >= 30 ? "#DC2626" : (100-tasaEntrega) >= 15 ? "#F59E0B" : "#16A34A" }}>{100 - tasaEntrega}%</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flow rail */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="h2">Flujo de pedidos</div>
          <div className="segmented" style={{ marginLeft: "auto" }}>
            <button className={filterCarrier === "todas" ? "active" : ""} onClick={() => setFilterCarrier("todas")}>Todas</button>
            {(Object.entries(CARRIERS) as [keyof typeof CARRIERS, typeof CARRIERS.hoko][]).map(([k, v]) => (
              <button key={k} className={filterCarrier === k ? "active" : ""} onClick={() => setFilterCarrier(k)}>
                {v.name}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 800 }}>
            {STAGES_FLOW.map((stageId, i) => {
              const s = STAGES.find((x) => x.id === stageId);
              if (!s) return null;
              const count = filtered.filter((o) => o.stage === s.id).length;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      {count}
                    </div>
                    <div className="label">{s.label}</div>
                  </div>
                  {i < STAGES_FLOW.length - 1 && <div style={{ flex: 1, height: 2, background: "var(--border)", minWidth: 20 }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kanban con drag&drop */}
      <div className="card">
        <div className="card-header">
          <div className="h2">Kanban — arrastrá tarjetas entre columnas o click para ver chat</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Buscar nombre, teléfono o guía..."
                style={{
                  padding: "6px 28px 6px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--panel-sub)",
                  fontSize: 12,
                  width: 260,
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    color: "var(--text-sub)",
                    fontSize: 14,
                    padding: 2,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <a
              href="/api/admin/export?estado=confirmado"
              target="_blank"
              className="btn primary"
              style={{ fontSize: 12, padding: "6px 12px", textDecoration: "none" }}
            >
              📊 Exportar para HOKO
            </a>
            <span className="muted" style={{ fontSize: 11 }}>
              {loading ? "Cargando..." : `${filtered.length} pedidos`}
            </span>
          </div>
        </div>
        <div className="card-body" style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, minmax(180px, 1fr))`, gap: 10 }}>
            {STAGES.map((s) => {
              const items = filtered.filter((o) => o.stage === s.id);
              const total = items.reduce((acc, o) => acc + (o.total || 0), 0);
              return (
                <div
                  key={s.id}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, s.id)}
                  style={{
                    background: "var(--panel-sub)",
                    borderRadius: 8,
                    padding: 8,
                    minHeight: 200,
                    borderTop: `3px solid ${s.color}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                      <span className="label">{s.label}</span>
                    </div>
                    <span className="num" style={{ fontSize: 11, color: "var(--text-sub)" }}>{items.length}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginBottom: 8 }}>
                    ${total.toLocaleString("es-CO")}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((o) => (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, o.id)}
                        onClick={() => setOpenOrder(o)}
                        style={{
                          background: "var(--panel)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 11.5,
                          cursor: "grab",
                          opacity: draggingId === o.id ? 0.5 : 1,
                          userSelect: "none",
                        }}
                      >
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{o.id}</div>
                        <div style={{ fontWeight: 600 }}>{o.customer}</div>
                        <div className="muted" style={{ fontSize: 10.5 }}>{o.city}</div>
                        <div className="muted" style={{ fontSize: 10.5 }}>{o.cantidad}f · ${o.total.toLocaleString("es-CO")}</div>
                        {o.guia && <div className="mono" style={{ fontSize: 10, marginTop: 4, color: "var(--text-sub)" }}>{o.guia}</div>}
                        {o.carrier !== "—" && (
                          <div style={{ marginTop: 4 }}>
                            <span className="pill" style={{ background: CARRIERS[o.carrier].color, color: "#fff", borderColor: "transparent", fontSize: 9.5 }}>
                              {CARRIERS[o.carrier].name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="muted" style={{ textAlign: "center", fontSize: 10.5, padding: 12 }}>—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {openOrder && (
        <DrawerConversacion order={openOrder} onClose={() => setOpenOrder(null)} onMover={moverPedido} />
      )}
    </>
  );
}

type HistorialItem = { tipo: string; etiqueta: string; fecha: string; comentario: string | null };

function DrawerConversacion({ order, onClose, onMover }: { order: PipelineOrder; onClose: () => void; onMover: (id: string, s: PipelineOrder["stage"]) => Promise<void> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<HistorialItem[] | null>(null);
  const [historialLoading, setHistorialLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function cargarHistorial() {
    setHistorialLoading(true);
    try {
      const r = await fetch(`/api/admin/pedidos/${encodeURIComponent(order.id)}/historial`, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setHistorial(data.historial || []);
      }
    } finally {
      setHistorialLoading(false);
    }
  }

  function toggleHistorial() {
    if (!showHistorial && !historial) cargarHistorial();
    setShowHistorial(!showHistorial);
  }

  async function cargarMensajes() {
    const r = await fetch(`/api/admin/conversaciones?telefono=${encodeURIComponent(order.phone)}`, { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as Message[];
    setMessages(data);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  }

  useEffect(() => {
    cargarMensajes();
    const t = setInterval(cargarMensajes, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.phone]);

  async function enviar() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/admin/conversaciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefono: order.phone, texto: draft.trim() }),
      });
      if (r.ok) {
        setDraft("");
        await cargarMensajes();
      }
    } finally {
      setSending(false);
    }
  }

  const stageActual = STAGES.find((s) => s.id === order.stage);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        zIndex: 90, display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)", height: "100vh", background: "var(--panel)",
          display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} className="btn" style={{ padding: "4px 10px" }}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{order.customer}</span>
              <button
                onClick={toggleHistorial}
                className="btn"
                style={{ fontSize: 10, padding: "3px 8px", background: showHistorial ? "var(--brand-soft)" : "transparent" }}
                title="Ver historial cronológico del pedido"
              >
                🕐 Historial
              </button>
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              <a href={`https://wa.me/${order.phone.replace(/\D/g, "")}`} target="_blank" style={{ color: "var(--brand-ink)", textDecoration: "none" }}>{order.phone}</a> · {order.id}
            </div>
          </div>
          {stageActual && (
            <span className="pill" style={{ background: stageActual.color, color: "#fff", borderColor: "transparent" }}>
              {stageActual.label}
            </span>
          )}
        </div>

        {/* Panel de historial desplegable */}
        {showHistorial && (
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)", background: "var(--panel-sub)", maxHeight: 280, overflowY: "auto" }}>
            <div className="label" style={{ marginBottom: 8 }}>📜 Historial del pedido</div>
            {historialLoading && <div className="muted" style={{ fontSize: 11 }}>Cargando...</div>}
            {!historialLoading && historial && historial.length === 0 && (
              <div className="muted" style={{ fontSize: 11 }}>Sin eventos registrados</div>
            )}
            {!historialLoading && historial && historial.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {historial.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, paddingBottom: 6, borderBottom: i < historial.length - 1 ? "1px dashed var(--border)" : "none" }}>
                    <div style={{ minWidth: 90, color: "var(--text-muted)", fontFamily: "monospace" }}>
                      {new Date(h.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" })}
                      {" "}
                      {new Date(h.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{h.etiqueta}</div>
                      {h.comentario && <div className="muted" style={{ fontSize: 10 }}>{h.comentario}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel de info del pedido */}
        <div style={{ padding: 12, borderBottom: "1px solid var(--border)", background: "var(--panel-sub)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
          <div>
            <div className="label" style={{ fontSize: 10 }}>Pedido</div>
            <div style={{ fontWeight: 600 }}>{order.cantidad} frasco{order.cantidad > 1 ? "s" : ""} {order.diasTratamiento ? `(${order.diasTratamiento}d)` : ""}</div>
          </div>
          <div>
            <div className="label" style={{ fontSize: 10 }}>Total contra entrega</div>
            <div style={{ fontWeight: 600 }}>${order.total.toLocaleString("es-CO")}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="label" style={{ fontSize: 10 }}>Dirección</div>
            <div>{order.direccion || "—"}{order.referencia ? ` (${order.referencia})` : ""}</div>
            <div className="muted" style={{ fontSize: 11 }}>{order.city}{order.departamento ? `, ${order.departamento}` : ""}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div className="label" style={{ fontSize: 10 }}>Guía y transportadora</div>
            {order.guia ? (
              <>
                <div className="mono" style={{ fontWeight: 600 }}>{order.guia}</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {order.transportadora || (order.carrier !== "—" ? CARRIERS[order.carrier].name : "—")}
                </div>
              </>
            ) : (
              <div className="muted">Sin guía aún</div>
            )}
          </div>
          {order.novedadResolucion && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="label" style={{ fontSize: 10 }}>✅ Resolución de novedad</div>
              <div style={{ fontSize: 11 }}>{order.novedadResolucion}</div>
            </div>
          )}
          {order.creadoEn && (
            <div style={{ gridColumn: "1 / -1" }} className="muted">
              Pedido recibido: {new Date(order.creadoEn).toLocaleString("es-CO")}
            </div>
          )}
        </div>

        {/* Selector rápido de estado */}
        <div style={{ padding: 12, borderBottom: "1px solid var(--border)", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => onMover(order.id, s.id)}
              className="btn"
              style={{
                fontSize: 11,
                padding: "4px 10px",
                background: order.stage === s.id ? s.color : "transparent",
                color: order.stage === s.id ? "#fff" : "var(--text)",
                borderColor: order.stage === s.id ? s.color : "var(--border)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.from === "bot" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              <div
                style={{
                  background: m.from === "bot" ? "var(--brand-soft)" : "var(--panel-sub)",
                  color: m.from === "bot" ? "var(--brand-ink)" : "var(--text)",
                  padding: "8px 12px",
                  borderRadius: 10,
                  borderTopRightRadius: m.from === "bot" ? 2 : 10,
                  borderTopLeftRadius: m.from === "bot" ? 10 : 2,
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text}
              </div>
              <div className="muted" style={{ fontSize: 10, marginTop: 2, textAlign: m.from === "bot" ? "right" : "left" }}>{formatTime(m.time)}</div>
            </div>
          ))}
          {messages.length === 0 && <div className="muted" style={{ textAlign: "center", marginTop: 40 }}>Sin mensajes aún</div>}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escribir como operador (saltea a Camila)..."
            disabled={sending}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--panel-sub)",
              fontSize: 13,
            }}
          />
          <button className="btn primary" onClick={enviar} disabled={sending || !draft.trim()}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
