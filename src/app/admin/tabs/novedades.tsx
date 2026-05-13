"use client";

import { useEffect, useMemo, useState } from "react";

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

export function Novedades() {
  const [rows, setRows] = useState<NovedadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("activas");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/novedades?activas=${filtro === "activas" ? "1" : "0"}`, { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as NovedadRow[];
      setRows(data);
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

  async function marcarResuelto(id: string) {
    const nota = window.prompt("Nota de resolución (opcional):") || "";
    if (nota === null) return;
    setResolviendo(id);
    try {
      await fetch("/api/admin/novedades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedidoId: id, nota }),
      });
      await cargar();
    } finally {
      setResolviendo(null);
    }
  }

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
    const tipos: Record<string, number> = {};
    rows.forEach((r) => {
      const t = r.novedad_tipo || "generica";
      tipos[t] = (tipos[t] || 0) + 1;
    });
    const topTipo = Object.entries(tipos).sort((a, b) => b[1] - a[1])[0];
    return { activas, repetidas, resueltas, total: rows.length, topTipo };
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

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <StatBox label="Activas" value={stats.activas} color="#EF5350" />
        <StatBox label="Repetidas" value={stats.repetidas} color="#FFA726" />
        <StatBox label="Resueltas" value={stats.resueltas} color="#66BB6A" />
        <StatBox label="Total en vista" value={stats.total} color="#42A5F5" />
      </div>

      {/* Tipo filter */}
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
                <Th>Acción</Th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((row) => {
                const tipoInfo = TIPOS[row.novedad_tipo as keyof typeof TIPOS] || TIPOS.generica;
                const horas = horasDesde(row.novedad_inicio);
                const repetida = (row.novedades_count || 0) >= 2;
                const resuelta = !!row.novedad_resolucion;
                return (
                  <tr key={row.id} style={{ borderTop: "1px solid #E0E0E0", background: resuelta ? "#F1F8E9" : "transparent" }}>
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
                    <Td>
                      {!resuelta && (
                        <button onClick={() => marcarResuelto(row.id)} disabled={resolviendo === row.id} style={resolverBtn}>
                          {resolviendo === row.id ? "..." : "Marcar resuelto"}
                        </button>
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
  padding: "5px 10px", borderRadius: 4, border: "1px solid #2E7D32",
  background: "#2E7D32", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
};
