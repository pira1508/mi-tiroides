"use client";

import { useEffect, useState } from "react";

type Preliminar = {
  id: string;
  nombre: string;
  telefono: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  referencia?: string;
  cantidad: number;
  dias_tratamiento: number;
  total: number;
  estado: string;
  estado_preliminar_ts: string;
  intentos_completar: number;
  msg_faltantes: string | null;
  creado_en: string;
  actualizado_en: string;
};

export function Preliminares() {
  const [preliminares, setPrelimi] = useState<Preliminar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarPrelimi = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/preliminares", { cache: "no-store" });
      if (!r.ok) throw new Error(`Error ${r.status}`);

      const datos = await r.json();
      setPrelimi(Array.isArray(datos) ? datos : datos.data || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPrelimi();
    const interval = setInterval(cargarPrelimi, 30000); // Recargar cada 30s
    return () => clearInterval(interval);
  }, []);

  const confirmar = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/preliminares/${id}/confirmar`, { method: "POST" });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      await cargarPrelimi();
    } catch (e) {
      alert(`Error confirmar: ${e}`);
    }
  };

  const descartar = async (id: string) => {
    if (!confirm(`¿Descartar pedido ${id}?`)) return;
    try {
      const r = await fetch(`/api/admin/preliminares/${id}/cancelar`, { method: "POST" });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      await cargarPrelimi();
    } catch (e) {
      alert(`Error descartar: ${e}`);
    }
  };

  const fmtFecha = (iso: string) => {
    return new Date(iso).toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const fmtCOP = (n: number) => "$" + n.toLocaleString("es-CO");

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>📋 Pedidos Preliminares ({preliminares.length})</h2>
        <button onClick={cargarPrelimi} disabled={loading}>
          {loading ? "Cargando..." : "🔄 Recargar"}
        </button>
      </div>

      {error && <div style={{ color: "red", marginBottom: "20px" }}>Error: {error}</div>}

      {preliminares.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
          No hay pedidos preliminares pendientes
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>ID</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Creado</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Nombre</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Teléfono</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Departamento</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Ciudad</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Dirección</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Qty</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Notas</th>
                <th style={{ padding: "12px", textAlign: "center", fontWeight: "600" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {preliminares.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "12px", fontFamily: "monospace", color: "#1f3d2b" }}>
                    <strong>{p.id}</strong>
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px" }}>{fmtFecha(p.creado_en)}</td>
                  <td style={{ padding: "12px" }}>
                    {p.nombre ? p.nombre : <span style={{ color: "red", fontWeight: "bold" }}>SIN NOMBRE</span>}
                  </td>
                  <td style={{ padding: "12px", fontFamily: "monospace" }}>{p.telefono}</td>
                  <td style={{ padding: "12px" }}>
                    {p.departamento ? p.departamento : <span style={{ color: "red", fontWeight: "bold" }}>?</span>}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {p.ciudad ? p.ciudad : <span style={{ color: "red", fontWeight: "bold" }}>?</span>}
                  </td>
                  <td style={{ padding: "12px", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.direccion ? p.direccion : <span style={{ color: "red", fontWeight: "bold" }}>?</span>}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {p.cantidad > 0 ? `${p.cantidad}x` : <span style={{ color: "red", fontWeight: "bold" }}>?</span>}
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px", maxWidth: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.msg_faltantes && p.msg_faltantes.includes("Duplicado") ? (
                      <span style={{ color: "red", fontWeight: "bold" }}>🔁 Duplicado</span>
                    ) : null}
                    {p.msg_faltantes || "—"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                      <button
                        onClick={() => confirmar(p.id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ✅ Confirmar
                      </button>
                      <button
                        onClick={() => descartar(p.id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        ❌ Descartar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
