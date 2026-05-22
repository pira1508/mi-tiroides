"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageBubble } from "./_message-bubble";

type NovedadRow = {
  id: string;
  nombre: string;
  telefono: string;
  ciudad?: string;
  direccion?: string;
  referencia?: string;
  cantidad?: number;
  total?: number;
  estado: string;
  guia?: string;
  transportadora?: string;
  motivo_no_entrega?: string;
  novedades_count?: number;
  novedad_tipo?: string;
  novedad_inicio?: string;
  novedad_mensajes?: number;
  novedad_resolucion?: string;
  creado_en: string;
  actualizado_en?: string;
};

type Filtro = "activas" | "todas" | "resueltas" | "repetidas";

type Message = { from: "bot" | "user" | "operador" | "cliente"; text: string; time: string; mediaArchivo?: string | null; mediaMime?: string | null; transcripcion?: string | null };
type HistorialItem = { tipo: string; etiqueta: string; fecha: string; comentario: string | null };

const TIPOS = {
  no_contesta: { emoji: "📞", label: "No contesta", color: "#FFA726" },
  direccion_mala: { emoji: "📍", label: "Dirección mala", color: "#EF5350" },
  no_estaba: { emoji: "🏠", label: "No estaba", color: "#FFCA28" },
  rechazado: { emoji: "❌", label: "Rechazado", color: "#AB47BC" },
  reprogramar: { emoji: "📅", label: "Reprogramar", color: "#26C6DA" },
  generica: { emoji: "❓", label: "Genérica", color: "#78909C" },
};

function fmtCOP(n?: number) {
  if (!n) return "—";
  return "$" + n.toLocaleString("es-CO");
}

function fmtFecha(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

function horasDesde(iso?: string) {
  if (!iso) return null;
  return (Date.now() - new Date(iso).getTime()) / 3600_000;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function Novedades() {
  const [rows, setRows] = useState<NovedadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("activas");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [openRow, setOpenRow] = useState<NovedadRow | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/novedades?activas=${filtro === "activas" ? "1" : "0"}`, { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as NovedadRow[];
      setRows(data);
      // Si hay drawer abierto, refrescar su data
      if (openRow) {
        const updated = data.find((d) => d.id === openRow.id);
        if (updated) setOpenRow(updated);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const filtradas = useMemo(() => {
    let r = rows;
    if (filtro === "resueltas") r = r.filter((x) => x.novedad_resolucion);
    if (filtro === "repetidas") r = r.filter((x) => (x.novedades_count || 0) >= 2);
    if (tipoFiltro) r = r.filter((x) => x.novedad_tipo === tipoFiltro);
    return r;
  }, [rows, filtro, tipoFiltro]);

  const stats = useMemo(() => {
    const activas = rows.filter((r) => r.estado === "novedad" && !r.novedad_resolucion).length;
    const repetidas = rows.filter((r) => (r.novedades_count || 0) >= 2).length;
    const resueltas = rows.filter((r) => !!r.novedad_resolucion).length;
    return { activas, repetidas, resueltas, total: rows.length };
  }, [rows]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Novedades de entrega</h2>
        <div style={{ display: "flex", gap: 6 }}>
          {(["activas", "resueltas", "repetidas", "todas"] as Filtro[]).map((f) => (
            <button key={f} onClick={() => setFiltro(f)} style={btnTab(filtro === f)}>
              {f === "activas" ? "Activas" : f === "resueltas" ? "Resueltas" : f === "repetidas" ? "Repetidas" : "Todas"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatBox label="Activas" value={stats.activas} color="#EF5350" />
        <StatBox label="Repetidas" value={stats.repetidas} color="#FFA726" />
        <StatBox label="Resueltas" value={stats.resueltas} color="#66BB6A" />
        <StatBox label="Total en vista" value={stats.total} color="#42A5F5" />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setTipoFiltro("")} style={chipBtn(tipoFiltro === "")}>Todos los tipos</button>
        {Object.entries(TIPOS).map(([k, v]) => (
          <button key={k} onClick={() => setTipoFiltro(k)} style={chipBtn(tipoFiltro === k, v.color)}>
            {v.emoji} {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "#888", padding: 20 }}>Cargando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ color: "#888", padding: 20 }}>Sin novedades en esta vista.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F1F3F4", textAlign: "left" }}>
                <Th>Pedido</Th>
                <Th>Cliente</Th>
                <Th>Tipo</Th>
                <Th>Mensajes</Th>
                <Th>Inicio</Th>
                <Th>Hoko dijo</Th>
                <Th>Respuesta cliente</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((row) => {
                const tipoInfo = TIPOS[row.novedad_tipo as keyof typeof TIPOS] || TIPOS.generica;
                const horas = horasDesde(row.novedad_inicio);
                const repetida = (row.novedades_count || 0) >= 2;
                const resuelta = !!row.novedad_resolucion;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setOpenRow(row)}
                    style={{
                      borderTop: "1px solid #E0E0E0",
                      background: resuelta ? "#F1F8E9" : "transparent",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = resuelta ? "#DCEDC8" : "#FAFAFA")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = resuelta ? "#F1F8E9" : "transparent")}
                  >
                    <Td>
                      <div style={{ fontWeight: 700 }}>{row.id.slice(-6)}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{fmtCOP(row.total)} · {row.cantidad}f</div>
                      {repetida && (
                        <span style={{ background: "#FFE0B2", color: "#E65100", fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                          🔁 {row.novedades_count}× novedades
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{row.nombre}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{row.telefono}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>{row.ciudad}</div>
                    </Td>
                    <Td>
                      <span style={{ background: tipoInfo.color, color: "#fff", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                        {tipoInfo.emoji} {tipoInfo.label}
                      </span>
                    </Td>
                    <Td>
                      <div>{row.novedad_mensajes || 0}/5</div>
                      <div style={{ fontSize: 10, color: "#888" }}>{horas !== null ? `hace ${horas.toFixed(1)}h` : "—"}</div>
                    </Td>
                    <Td>{fmtFecha(row.novedad_inicio)}</Td>
                    <Td>
                      <div style={{ maxWidth: 220, fontSize: 12, color: "#444" }}>{row.motivo_no_entrega || "—"}</div>
                    </Td>
                    <Td>
                      {resuelta ? (
                        <div style={{ maxWidth: 220, fontSize: 12, color: "#2E7D32" }}>✅ {row.novedad_resolucion}</div>
                      ) : (
                        <div style={{ fontSize: 11, color: "#888" }}>Esperando respuesta</div>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: "#888", lineHeight: 1.6 }}>
        <strong>Cómo funciona:</strong> Cuando Hoko reporta una novedad, Camila escribe al cliente y programa 4 mensajes de seguimiento (a los +30 min, +2h, +3h y +12h). Si el cliente responde, los mensajes se cancelan y se notifica al operador con la acción concreta a hacer en el panel de Hoko. Las repetidas (mismo pedido con 2+ novedades) se marcan en naranja.
        <br />
        <strong>Click en una fila</strong> para ver el chat completo, historial del pedido, datos del cliente y marcar la novedad como resuelta.
      </div>

      {openRow && (
        <DrawerNovedad row={openRow} onClose={() => setOpenRow(null)} onChanged={cargar} />
      )}
    </div>
  );
}

function DrawerNovedad({ row, onClose, onChanged }: { row: NovedadRow; onClose: () => void; onChanged: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<HistorialItem[] | null>(null);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tipoInfo = TIPOS[row.novedad_tipo as keyof typeof TIPOS] || TIPOS.generica;
  const resuelta = !!row.novedad_resolucion;
  const horas = horasDesde(row.novedad_inicio);

  async function cargarMensajes(initial = false) {
    const r = await fetch(`/api/admin/conversaciones?telefono=${encodeURIComponent(row.telefono)}`, { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as Message[];
    const el = scrollRef.current;
    const estabaAlFondo = el ? (el.scrollHeight - el.scrollTop - el.clientHeight) < 80 : true;
    setMessages((prev) => {
      if (prev.length === data.length && prev.length > 0) {
        const last = prev[prev.length - 1];
        const lastNew = data[data.length - 1];
        if (last?.time === lastNew?.time && last?.text === lastNew?.text) return prev;
      }
      return data;
    });
    const hayCambio = data.length !== messages.length || (data.length > 0 && data[data.length - 1]?.time !== messages[messages.length - 1]?.time);
    if (initial || (hayCambio && estabaAlFondo)) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    }
  }

  useEffect(() => {
    cargarMensajes(true);
    const t = setInterval(() => cargarMensajes(), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.telefono]);

  async function cargarHistorial() {
    setHistorialLoading(true);
    try {
      const r = await fetch(`/api/admin/pedidos/${encodeURIComponent(row.id)}/historial`, { cache: "no-store" });
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

  async function enviar() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/admin/conversaciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefono: row.telefono, texto: draft.trim() }),
      });
      if (r.ok) {
        setDraft("");
        await cargarMensajes(true);
      }
    } finally {
      setSending(false);
    }
  }

  async function marcarResuelto() {
    const nota = window.prompt("Nota de resolución (qué hiciste en el panel de Hoko):") || "";
    if (!nota.trim()) return;
    setResolviendo(true);
    try {
      const r = await fetch("/api/admin/novedades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedidoId: row.id, nota: nota.trim() }),
      });
      if (r.ok) {
        await onChanged();
      }
    } finally {
      setResolviendo(false);
    }
  }

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
          width: "min(560px, 100%)", height: "100vh", background: "#fff",
          display: "flex", flexDirection: "column", boxShadow: "-4px 0 20px rgba(0,0,0,.25)",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #E0E0E0", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={iconBtn}>✕</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{row.nombre}</span>
              <button
                onClick={toggleHistorial}
                style={{ ...miniBtn, background: showHistorial ? "#E8F5E9" : "transparent" }}
                title="Ver historial cronológico del pedido"
              >
                🕐 Historial
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              <a href={`https://wa.me/${row.telefono.replace(/\D/g, "")}`} target="_blank" style={{ color: "#1565C0", textDecoration: "none" }}>{row.telefono}</a>
              {" · "}{row.id.slice(-8)}
            </div>
          </div>
          <span style={{ background: tipoInfo.color, color: "#fff", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
            {tipoInfo.emoji} {tipoInfo.label}
          </span>
        </div>

        {showHistorial && (
          <div style={{ padding: 12, borderBottom: "1px solid #E0E0E0", background: "#FAFAFA", maxHeight: 280, overflowY: "auto" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#555", marginBottom: 8, fontWeight: 700 }}>📜 Historial del pedido</div>
            {historialLoading && <div style={{ fontSize: 11, color: "#888" }}>Cargando...</div>}
            {!historialLoading && historial && historial.length === 0 && (
              <div style={{ fontSize: 11, color: "#888" }}>Sin eventos registrados</div>
            )}
            {!historialLoading && historial && historial.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {historial.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 11, paddingBottom: 6, borderBottom: i < historial.length - 1 ? "1px dashed #E0E0E0" : "none" }}>
                    <div style={{ minWidth: 90, color: "#888", fontFamily: "monospace" }}>
                      {new Date(h.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit" })}
                      {" "}
                      {new Date(h.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{h.etiqueta}</div>
                      {h.comentario && <div style={{ fontSize: 10, color: "#888" }}>{h.comentario}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info del pedido / novedad */}
        <div style={{ padding: 12, borderBottom: "1px solid #E0E0E0", background: "#FAFAFA", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
          <div>
            <div style={lbl}>Pedido</div>
            <div style={{ fontWeight: 600 }}>{row.cantidad || 1} frasco{(row.cantidad || 1) > 1 ? "s" : ""}</div>
          </div>
          <div>
            <div style={lbl}>Total contra entrega</div>
            <div style={{ fontWeight: 600 }}>{fmtCOP(row.total)}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={lbl}>Dirección</div>
            <div>{row.direccion || "—"}{row.referencia ? ` (${row.referencia})` : ""}</div>
            <div style={{ fontSize: 11, color: "#666" }}>{row.ciudad || "—"}</div>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={lbl}>Guía y transportadora</div>
            {row.guia ? (
              <>
                <div style={{ fontFamily: "monospace", fontWeight: 600 }}>{row.guia}</div>
                <div style={{ fontSize: 11, color: "#666" }}>{row.transportadora || "—"}</div>
              </>
            ) : (
              <div style={{ color: "#888" }}>Sin guía</div>
            )}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={lbl}>Motivo Hoko</div>
            <div style={{ fontSize: 12, color: "#444" }}>{row.motivo_no_entrega || "—"}</div>
          </div>
          <div>
            <div style={lbl}>Inicio novedad</div>
            <div style={{ fontSize: 12 }}>{fmtFecha(row.novedad_inicio)}</div>
            {horas !== null && <div style={{ fontSize: 10, color: "#888" }}>hace {horas.toFixed(1)}h</div>}
          </div>
          <div>
            <div style={lbl}>Mensajes Camila</div>
            <div style={{ fontSize: 12 }}>{row.novedad_mensajes || 0} / 5</div>
            {(row.novedades_count || 0) >= 2 && (
              <div style={{ fontSize: 10, color: "#E65100", fontWeight: 700 }}>🔁 {row.novedades_count}× novedades</div>
            )}
          </div>
          {resuelta && (
            <div style={{ gridColumn: "1 / -1", background: "#E8F5E9", padding: 8, borderRadius: 4 }}>
              <div style={{ ...lbl, color: "#2E7D32" }}>✅ Resolución</div>
              <div style={{ fontSize: 12, color: "#1B5E20" }}>{row.novedad_resolucion}</div>
            </div>
          )}
        </div>

        {/* Acción resolver */}
        {!resuelta && (
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #E0E0E0", background: "#FFF8E1", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: "#5D4037" }}>
              ⚠️ Hoko no permite resolver novedades por API. Resolvé en el panel de Hoko y marcá aquí.
            </div>
            <button onClick={marcarResuelto} disabled={resolviendo} style={resolverBtn}>
              {resolviendo ? "..." : "Marcar resuelto"}
            </button>
          </div>
        )}

        {/* Chat */}
        <div ref={scrollRef} style={{ flex: 1, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, background: "#FAFAFA" }}>
          {messages.map((m, i) => {
            const esBot = m.from === "bot" || m.from === "operador";
            return <MessageBubble key={i} m={m} esEnviadoPorBot={esBot} />;
          })}
          {messages.length === 0 && <div style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Sin mensajes aún</div>}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #E0E0E0", display: "flex", gap: 8, background: "#fff" }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Escribir como operador (pausa a Camila)..."
            disabled={sending}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid #CFD8DC",
              borderRadius: 6,
              background: "#fff",
              fontSize: 13,
            }}
          />
          <button onClick={enviar} disabled={sending || !draft.trim()} style={enviarBtn}>
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "8px 10px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: "#555", letterSpacing: 0.3 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "10px", verticalAlign: "top" }}>{children}</td>;
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${color}`, borderRadius: 6, padding: 12 }}>
      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 10, textTransform: "uppercase", color: "#666", fontWeight: 700, letterSpacing: 0.3, marginBottom: 2 };

const btnTab = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px", borderRadius: 6, border: `1px solid ${active ? "#2E7D32" : "#CFD8DC"}`,
  background: active ? "#2E7D32" : "#fff", color: active ? "#fff" : "#333",
  fontWeight: 700, fontSize: 12, cursor: "pointer",
});

const chipBtn = (active: boolean, color?: string): React.CSSProperties => ({
  padding: "4px 10px", borderRadius: 14, border: `1px solid ${active ? (color || "#2E7D32") : "#CFD8DC"}`,
  background: active ? (color || "#2E7D32") : "#fff", color: active ? "#fff" : "#333",
  fontWeight: 600, fontSize: 11, cursor: "pointer",
});

const resolverBtn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 4, border: "1px solid #2E7D32",
  background: "#2E7D32", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
};

const enviarBtn: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 6, border: "1px solid #2E7D32",
  background: "#2E7D32", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 4, border: "1px solid #CFD8DC",
  background: "#fff", color: "#333", fontSize: 13, cursor: "pointer",
};

const miniBtn: React.CSSProperties = {
  padding: "3px 8px", borderRadius: 4, border: "1px solid #CFD8DC",
  background: "transparent", color: "#333", fontSize: 10, fontWeight: 600, cursor: "pointer",
};
