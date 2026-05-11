"use client";

import { useEffect, useState } from "react";

type AtencionRow = {
  pedido_id: string;
  telefono: string;
  motivo: string;
  creado_en: string;
  nombre?: string;
  cantidad?: number;
  total?: number;
  ciudad?: string;
  estado?: string;
};

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-CO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export function Atencion({ onAbrirChat }: { onAbrirChat?: (tel: string) => void }) {
  const [items, setItems] = useState<AtencionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolviendo, setResolviendo] = useState<string | null>(null);

  async function cargar() {
    try {
      const r = await fetch("/api/admin/atencion", { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as AtencionRow[];
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 10000);
    return () => clearInterval(t);
  }, []);

  async function resolver(pedidoId: string) {
    setResolviendo(pedidoId);
    try {
      await fetch("/api/admin/atencion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      await cargar();
    } finally {
      setResolviendo(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body muted" style={{ padding: 60, textAlign: "center" }}>
          Cargando…
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div className="h2" style={{ marginBottom: 6 }}>Sin alertas pendientes</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Cuando una clienta escriba algo que Camila no pueda resolver, aparece acá.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="h2">⚠️ Atención requerida</div>
        <span className="pill warning" style={{ marginLeft: "auto" }}>{items.length} pendientes</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--panel-sub)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11 }}>Cliente</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11 }}>Pedido</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11 }}>Motivo</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11 }}>Cuándo</th>
              <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.pedido_id + row.telefono} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{row.nombre || "—"}</div>
                  <a href={`https://wa.me/${row.telefono.replace(/\D/g, "")}`} target="_blank" className="muted" style={{ fontSize: 10.5, textDecoration: "none" }}>{row.telefono}</a>
                  {row.ciudad && <div className="muted" style={{ fontSize: 10.5 }}>{row.ciudad}</div>}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>
                  {row.cantidad && <div>{row.cantidad}f · ${(row.total || 0).toLocaleString("es-CO")}</div>}
                  {row.estado && <span className="pill accent" style={{ fontSize: 10 }}>{row.estado}</span>}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--text-sub)", maxWidth: 360 }}>
                  {row.motivo}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 11 }} className="muted">{formatTime(row.creado_en)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  {onAbrirChat && (
                    <button className="btn" onClick={() => onAbrirChat(row.telefono)} style={{ fontSize: 11, padding: "4px 10px", marginRight: 6 }}>
                      💬 Chat
                    </button>
                  )}
                  <button
                    className="btn primary"
                    onClick={() => resolver(row.pedido_id)}
                    disabled={resolviendo === row.pedido_id}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {resolviendo === row.pedido_id ? "..." : "Resolver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
