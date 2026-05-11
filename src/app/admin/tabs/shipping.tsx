"use client";

const CARRIERS = [
  {
    id: "hoko",
    name: "Hoko Envíos",
    color: "#635BFF",
    sla: "24-48h",
    activos: 14,
    entregados: 86,
    novedades: 2,
    tasaExito: 94.5,
  },
  {
    id: "envia",
    name: "Envía",
    color: "#0284C7",
    sla: "48-72h",
    activos: 9,
    entregados: 54,
    novedades: 4,
    tasaExito: 89.2,
  },
  {
    id: "interrap",
    name: "Interrapidísimo",
    color: "#D97706",
    sla: "24-72h",
    activos: 11,
    entregados: 71,
    novedades: 1,
    tasaExito: 96.1,
  },
];

const GUIAS_ACTIVAS = [
  { guia: "HK7723", carrier: "Hoko", cliente: "María García", destino: "Bogotá", estado: "En tránsito", horas: 18 },
  { guia: "EN8821334", carrier: "Envía", cliente: "Luis Rodríguez", destino: "Medellín", estado: "Empacado", horas: 4 },
  { guia: "IR99231", carrier: "Interrapidísimo", cliente: "Andrea López", destino: "Cali", estado: "En reparto", horas: 32 },
  { guia: "HK7700", carrier: "Hoko", cliente: "Laura Torres", destino: "Manizales", estado: "En reparto", horas: 28 },
  { guia: "EN8820999", carrier: "Envía", cliente: "Sebastián Vargas", destino: "Ibagué", estado: "Entregado", horas: 65 },
  { guia: "IR99000", carrier: "Interrapidísimo", cliente: "Valentina Mejía", destino: "Neiva", estado: "Novedad", horas: 48 },
];

export function Shipping() {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
        {CARRIERS.map((c) => (
          <div key={c.id} className="card">
            <div className="card-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: c.color, color: "#fff", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 700 }}>
                {c.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div className="h2">{c.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>SLA {c.sla}</div>
              </div>
              <span className="pill success">{c.tasaExito}% éxito</span>
            </div>
            <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <div>
                <div className="label">Activos</div>
                <div className="h1 num">{c.activos}</div>
              </div>
              <div>
                <div className="label">Entregados</div>
                <div className="h1 num" style={{ color: "var(--success)" }}>{c.entregados}</div>
              </div>
              <div>
                <div className="label">Novedades</div>
                <div className="h1 num" style={{ color: c.novedades > 0 ? "var(--danger)" : "var(--text-muted)" }}>{c.novedades}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="h2">Guías activas</div>
          <span className="muted" style={{ fontSize: 11 }}>{GUIAS_ACTIVAS.length} guías</span>
        </div>
        <div className="card-body tight" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Guía</th>
                <th>Carrier</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Estado</th>
                <th className="t-right">Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {GUIAS_ACTIVAS.map((g) => (
                <tr key={g.guia} className="row-clickable">
                  <td className="mono">{g.guia}</td>
                  <td>{g.carrier}</td>
                  <td style={{ fontWeight: 500 }}>{g.cliente}</td>
                  <td>{g.destino}</td>
                  <td>
                    <span className={`pill ${g.estado === "Entregado" ? "success" : g.estado === "Novedad" ? "danger" : g.estado === "En reparto" ? "accent" : "info"}`}>
                      {g.estado}
                    </span>
                  </td>
                  <td className="t-right num">{g.horas}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
