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
  carrier: "hoko" | "envia" | "interrap" | "—";
  stage: "nuevo" | "confirmado" | "subido_hoko" | "guia_generada" | "empacado" | "recogido" | "transito" | "reparto" | "entregado" | "novedad" | "devuelto" | "cancelado";
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

const STAGES: { id: PipelineOrder["stage"]; label: string; color: string; estadoBot: string }[] = [
  { id: "nuevo", label: "Nuevo", color: "#D97706", estadoBot: "nuevo" },
  { id: "confirmado", label: "Confirmado", color: "#0284C7", estadoBot: "confirmado" },
  { id: "subido_hoko", label: "Subido a HOKO", color: "#0EA5E9", estadoBot: "subido_hoko" },
  { id: "guia_generada", label: "Guía generada", color: "#06B6D4", estadoBot: "guia_generada" },
  { id: "empacado", label: "Empacado", color: "#635BFF", estadoBot: "empacado" },
  { id: "recogido", label: "Recogido", color: "#7C3AED", estadoBot: "recogido" },
  { id: "transito", label: "En tránsito", color: "#0F3D2E", estadoBot: "despachado" },
  { id: "reparto", label: "En reparto", color: "#DB2777", estadoBot: "en_ruta" },
  { id: "entregado", label: "Entregado", color: "#16A34A", estadoBot: "entregado" },
  { id: "novedad", label: "Novedad", color: "#DC2626", estadoBot: "novedad" },
  { id: "devuelto", label: "Devuelto", color: "#94A3B8", estadoBot: "devuelto" },
  { id: "cancelado", label: "Cancelado", color: "#64748B", estadoBot: "cancelado" },
];

function mapStage(estado: string): PipelineOrder["stage"] {
  if (estado === "despachado") return "transito";
  if (estado === "en_ruta") return "reparto";
  // estados directos: nuevo, confirmado, subido_hoko, guia_generada, empacado, recogido, entregado, novedad, devuelto
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

export function Pipeline() {
  const [orders, setOrders] = useState<PipelineOrder[]>([]);
  const [filterCarrier, setFilterCarrier] = useState<"todas" | keyof typeof CARRIERS>("todas");
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [openOrder, setOpenOrder] = useState<PipelineOrder | null>(null);

  async function cargar() {
    try {
      const r = await fetch("/api/admin/pedidos", { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      const mapped: PipelineOrder[] = (data.pedidos || []).map((p: {id:string;nombre:string;telefonoCliente:string;ciudad:string;departamento?:string;direccion?:string;referencia?:string;cantidad:number;diasTratamiento?:number;total:number;estado:string;guia?:string;transportadora?:string;creadoEn?:string}) => ({
        id: p.id,
        customer: p.nombre || "—",
        phone: p.telefonoCliente || "",
        city: p.ciudad || "—",
        departamento: p.departamento,
        direccion: p.direccion,
        referencia: p.referencia,
        guia: p.guia,
        carrier: mapCarrier(p.transportadora),
        stage: mapStage(p.estado),
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

  const filtered = filterCarrier === "todas" ? orders : orders.filter((o) => o.carrier === filterCarrier);

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

  return (
    <>
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
            {STAGES.slice(0, 7).map((s, i) => {
              const count = filtered.filter((o) => o.stage === s.id).length;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: s.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                      {count}
                    </div>
                    <div className="label">{s.label}</div>
                  </div>
                  {i < 6 && <div style={{ flex: 1, height: 2, background: "var(--border)", minWidth: 20 }} />}
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
          <a
            href="/api/admin/export?estado=confirmado"
            target="_blank"
            className="btn primary"
            style={{ marginLeft: "auto", fontSize: 12, padding: "6px 12px", textDecoration: "none" }}
          >
            📊 Exportar para HOKO
          </a>
          <span className="muted" style={{ fontSize: 11, marginLeft: 12 }}>
            {loading ? "Cargando..." : `${filtered.length} pedidos`}
          </span>
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

function DrawerConversacion({ order, onClose, onMover }: { order: PipelineOrder; onClose: () => void; onMover: (id: string, s: PipelineOrder["stage"]) => Promise<void> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
            <div style={{ fontWeight: 700, fontSize: 15 }}>{order.customer}</div>
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
          {order.guia && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="label" style={{ fontSize: 10 }}>Guía {order.carrier !== "—" ? "· " + CARRIERS[order.carrier].name : ""}</div>
              <div className="mono">{order.guia}</div>
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
