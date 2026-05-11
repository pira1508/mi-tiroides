"use client";

import { useState } from "react";

type PipelineOrder = {
  id: string;
  customer: string;
  city: string;
  guia?: string;
  carrier: "hoko" | "envia" | "interrap";
  stage: "nuevo" | "confirmado" | "empacado" | "recogido" | "transito" | "reparto" | "entregado" | "novedad" | "devuelto";
};

const CARRIERS = {
  hoko: { name: "Hoko Envíos", color: "#635BFF" },
  envia: { name: "Envía", color: "#0284C7" },
  interrap: { name: "Interrapidísimo", color: "#D97706" },
};

const STAGES: { id: PipelineOrder["stage"]; label: string; color: string }[] = [
  { id: "nuevo", label: "Nuevo", color: "#D97706" },
  { id: "confirmado", label: "Confirmado", color: "#0284C7" },
  { id: "empacado", label: "Empacado", color: "#635BFF" },
  { id: "recogido", label: "Recogido", color: "#7C3AED" },
  { id: "transito", label: "En tránsito", color: "#0F3D2E" },
  { id: "reparto", label: "En reparto", color: "#DB2777" },
  { id: "entregado", label: "Entregado", color: "#16A34A" },
  { id: "novedad", label: "Novedad", color: "#DC2626" },
  { id: "devuelto", label: "Devuelto", color: "#94A3B8" },
];

const MOCK_PIPELINE: PipelineOrder[] = [
  { id: "PIRA-10031", customer: "María García", city: "Bogotá", carrier: "hoko", stage: "nuevo" },
  { id: "PIRA-10030", customer: "Luis Rodríguez", city: "Medellín", carrier: "envia", stage: "confirmado", guia: "EN8821334" },
  { id: "PIRA-10029", customer: "Andrea López", city: "Cali", carrier: "interrap", stage: "empacado", guia: "IR99231" },
  { id: "PIRA-10028", customer: "Carlos Pérez", city: "Cartagena", carrier: "hoko", stage: "recogido", guia: "HK7723" },
  { id: "PIRA-10027", customer: "Diana Ramírez", city: "Bucaramanga", carrier: "envia", stage: "transito", guia: "EN8821112" },
  { id: "PIRA-10026", customer: "Felipe Gómez", city: "Pereira", carrier: "interrap", stage: "transito", guia: "IR99100" },
  { id: "PIRA-10025", customer: "Laura Torres", city: "Manizales", carrier: "hoko", stage: "reparto", guia: "HK7700" },
  { id: "PIRA-10024", customer: "Sebastián Vargas", city: "Ibagué", carrier: "envia", stage: "entregado", guia: "EN8820999" },
  { id: "PIRA-10023", customer: "Valentina Mejía", city: "Neiva", carrier: "interrap", stage: "novedad", guia: "IR99000" },
];

export function Pipeline() {
  const [filterCarrier, setFilterCarrier] = useState<"todas" | keyof typeof CARRIERS>("todas");

  const filtered = filterCarrier === "todas" ? MOCK_PIPELINE : MOCK_PIPELINE.filter((o) => o.carrier === filterCarrier);

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

      {/* Kanban */}
      <div className="card">
        <div className="card-header">
          <div className="h2">Kanban</div>
          <span className="muted" style={{ fontSize: 11 }}>{filtered.length} pedidos</span>
        </div>
        <div className="card-body" style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(180px, 1fr))", gap: 10 }}>
            {STAGES.map((s) => {
              const items = filtered.filter((o) => o.stage === s.id);
              return (
                <div key={s.id} style={{ background: "var(--panel-sub)", borderRadius: 8, padding: 8, minHeight: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                      <span className="label">{s.label}</span>
                    </div>
                    <span className="num" style={{ fontSize: 11, color: "var(--text-sub)" }}>{items.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((o) => (
                      <div key={o.id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, fontSize: 11.5, cursor: "pointer" }}>
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{o.id}</div>
                        <div style={{ fontWeight: 600 }}>{o.customer}</div>
                        <div className="muted" style={{ fontSize: 10.5 }}>{o.city}</div>
                        {o.guia && <div className="mono" style={{ fontSize: 10, marginTop: 4, color: "var(--text-sub)" }}>{o.guia}</div>}
                        <div style={{ marginTop: 4 }}>
                          <span className="pill" style={{ background: CARRIERS[o.carrier].color, color: "#fff", borderColor: "transparent", fontSize: 9.5 }}>
                            {CARRIERS[o.carrier].name}
                          </span>
                        </div>
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
    </>
  );
}
