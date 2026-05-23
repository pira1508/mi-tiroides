"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function PreliminaresPage() {
  const router = useRouter();
  const [preliminares, setPrelimi] = useState<Preliminar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");

  const cargarPrelimi = async (s: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/preliminares", {
        headers: { "x-secret": s },
      });
      if (!r.ok) {
        if (r.status === 401) {
          setError("Autenticación requerida");
          return;
        }
        throw new Error(`Error ${r.status}`);
      }

      const datos = await r.json();
      setPrelimi(Array.isArray(datos) ? datos : datos.data || []);
      localStorage.setItem("admin_secret", s);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("admin_secret");
    if (stored) {
      setSecret(stored);
      cargarPrelimi(stored);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret) cargarPrelimi(secret);
  };

  const confirmar = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/preliminares/${id}/confirmar`, {
        method: "POST",
        headers: { "x-secret": secret },
      });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      await cargarPrelimi(secret);
    } catch (e) {
      alert(`Error confirmar: ${e}`);
    }
  };

  const descartar = async (id: string) => {
    if (!confirm(`¿Descartar pedido ${id}?`)) return;
    try {
      const r = await fetch(`/api/admin/preliminares/${id}/cancelar`, {
        method: "POST",
        headers: { "x-secret": secret },
      });
      if (!r.ok) throw new Error(`Error ${r.status}`);
      await cargarPrelimi(secret);
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

  if (!secret) {
    return (
      <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto" }}>
        <h1>Pedidos Preliminares</h1>
        <p>Ingresa tu secret para acceder</p>
        <form onSubmit={handleLogin} style={{ display: "flex", gap: "10px" }}>
          <input
            type="password"
            placeholder="Secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              backgroundColor: "#1f3d2b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Acceder
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1>📋 Pedidos Preliminares ({preliminares.length})</h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => cargarPrelimi(secret)}
            disabled={loading}
            style={{
              padding: "8px 16px",
              backgroundColor: "#1f3d2b",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {loading ? "Cargando..." : "🔄 Recargar"}
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("admin_secret");
              setSecret("");
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "12px", borderRadius: "4px", marginBottom: "20px" }}>
          Error: {error}
        </div>
      )}

      {preliminares.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "#999", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
          <p style={{ fontSize: "18px", fontWeight: "600" }}>✨ No hay pedidos preliminares pendientes</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #d1d5db" }}>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>ID</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Creado</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Nombre</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Teléfono</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Depto</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Ciudad</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Dirección</th>
                <th style={{ padding: "12px", textAlign: "center", fontWeight: "600" }}>Qty</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Notas</th>
                <th style={{ padding: "12px", textAlign: "center", fontWeight: "600" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {preliminares.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: idx % 2 === 0 ? "white" : "#f9fafb" }}>
                  <td style={{ padding: "12px", fontFamily: "monospace", color: "#1f3d2b", fontWeight: "600" }}>
                    {p.id}
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px", whiteSpace: "nowrap" }}>
                    {fmtFecha(p.creado_en)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {p.nombre ? (
                      p.nombre
                    ) : (
                      <span style={{ color: "#dc2626", fontWeight: "bold", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "3px" }}>
                        SIN NOMBRE
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "12px" }}>
                    {p.telefono}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {p.departamento ? (
                      p.departamento
                    ) : (
                      <span style={{ color: "#dc2626", fontWeight: "bold", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "3px" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {p.ciudad ? (
                      p.ciudad
                    ) : (
                      <span style={{ color: "#dc2626", fontWeight: "bold", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "3px" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px", maxWidth: "180px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "12px" }}>
                    {p.direccion ? (
                      p.direccion
                    ) : (
                      <span style={{ color: "#dc2626", fontWeight: "bold", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "3px" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    {p.cantidad > 0 ? (
                      <span style={{ fontWeight: "600" }}>{p.cantidad}x</span>
                    ) : (
                      <span style={{ color: "#dc2626", fontWeight: "bold" }}>?</span>
                    )}
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px", maxWidth: "120px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.msg_faltantes && p.msg_faltantes.includes("Duplicado") ? (
                      <span style={{ color: "#dc2626", fontWeight: "bold", backgroundColor: "#fecaca", padding: "2px 6px", borderRadius: "3px" }}>
                        🔁 Duplicado
                      </span>
                    ) : null}
                    {!p.msg_faltantes ? "—" : p.msg_faltantes}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => confirmar(p.id)}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "#10b981",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        ✅
                      </button>
                      <button
                        onClick={() => descartar(p.id)}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        ❌
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
