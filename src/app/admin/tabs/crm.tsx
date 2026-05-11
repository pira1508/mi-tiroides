"use client";

import { useState } from "react";

type Thread = {
  id: string;
  name: string;
  phone: string;
  city: string;
  lastMsg: string;
  lastTime: string;
  unread: number;
  color: string;
  status: "lead" | "comprador" | "soporte";
};

const SEED_THREADS: Thread[] = [
  { id: "1", name: "Geraldine Álvarez", phone: "+57 3103564061", city: "Cali", lastMsg: "Pero eso es para que tipo de tiroides ?", lastTime: "21:14", unread: 1, color: "#635BFF", status: "lead" },
  { id: "2", name: "María Fernández", phone: "+57 3201234567", city: "Bogotá", lastMsg: "Gracias por la atención 🙏", lastTime: "20:42", unread: 0, color: "#16A34A", status: "comprador" },
  { id: "3", name: "Andrea Castro", phone: "+57 3115678901", city: "Medellín", lastMsg: "Confirmo el pedido de 2 frascos", lastTime: "19:30", unread: 2, color: "#D97706", status: "comprador" },
  { id: "4", name: "Luisa Pereira", phone: "+57 3009876543", city: "Pereira", lastMsg: "¿Cuándo llega mi guía?", lastTime: "18:15", unread: 1, color: "#DB2777", status: "soporte" },
  { id: "5", name: "Camila Restrepo", phone: "+57 3145555555", city: "Manizales", lastMsg: "Quiero saber el precio del tratamiento completo", lastTime: "17:00", unread: 0, color: "#0284C7", status: "lead" },
];

const MOCK_MESSAGES: Record<string, { from: "bot" | "cliente"; text: string; time: string }[]> = {
  "1": [
    { from: "cliente", text: "Hola, acabo de hacer un pedido en la página de MI TIROIDES y quiero confirmarlo.", time: "20:34" },
    { from: "bot", text: "Hola buenas noches, ¿cómo estás? Soy parte del equipo de MI TIROIDES", time: "21:11" },
    { from: "bot", text: "¿Eres Geraldine Álvarez correcto?\n573103564061\nCalle 53 No. 123-103 tierra linda...\n3 frasco(s) - $139.900\nConfirmas tu pedido?", time: "21:11" },
    { from: "cliente", text: "Si", time: "21:14" },
    { from: "cliente", text: "Pero eso es para que tipo de tiroides ?", time: "21:14" },
  ],
};

export function CRM() {
  const [threads] = useState(SEED_THREADS);
  const [activeId, setActiveId] = useState<string>("1");
  const active = threads.find((t) => t.id === activeId);
  const messages = MOCK_MESSAGES[activeId] || [];

  return (
    <div className="crm-grid">
      {/* Bandeja */}
      <div className="crm-col">
        <div className="card-header" style={{ borderRadius: 0 }}>
          <div className="h2">Bandeja</div>
          <span className="pill success" style={{ marginLeft: "auto" }}>
            <span className="dot" /> WhatsApp
          </span>
        </div>
        <div className="crm-chat-list">
          {threads.map((t) => (
            <div
              key={t.id}
              className={`chat-item ${activeId === t.id ? "active" : ""}`}
              onClick={() => setActiveId(t.id)}
            >
              <div className="chat-avatar" style={{ background: t.color }}>
                {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="chat-meta">
                <div className="chat-name">
                  <span>{t.name}</span>
                  <span className="chat-time">{t.lastTime}</span>
                </div>
                <div className="chat-preview">{t.lastMsg}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="muted" style={{ fontSize: 10 }}>{t.city}</span>
                  {t.unread > 0 && <span className="chat-unread">{t.unread}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversación */}
      <div className="crm-col">
        {active && (
          <>
            <div className="card-header" style={{ borderRadius: 0 }}>
              <div className="chat-avatar" style={{ background: active.color, width: 30, height: 30 }}>
                {active.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="h3">{active.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{active.phone} · {active.city}</div>
              </div>
              <span className={`pill ${active.status === "comprador" ? "success" : active.status === "soporte" ? "warning" : "accent"}`} style={{ marginLeft: "auto" }}>
                {active.status}
              </span>
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.from === "bot" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
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
                  <div className="muted" style={{ fontSize: 10, marginTop: 2, textAlign: m.from === "bot" ? "right" : "left" }}>{m.time}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
              <input
                placeholder="Escribir respuesta..."
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--panel-sub)",
                  fontSize: 13,
                }}
              />
              <button className="btn primary">Enviar</button>
            </div>
          </>
        )}
      </div>

      {/* Panel del cliente */}
      <div className="crm-col">
        {active && (
          <>
            <div className="card-header" style={{ borderRadius: 0 }}>
              <div className="h2">Cliente</div>
            </div>
            <div style={{ padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="label">Nombre</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{active.name}</div>
              </div>
              <div>
                <div className="label">Teléfono</div>
                <a
                  href={`https://wa.me/${active.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  style={{ fontSize: 13, color: "var(--brand-ink)", textDecoration: "none" }}
                >
                  {active.phone}
                </a>
              </div>
              <div>
                <div className="label">Ciudad</div>
                <div style={{ fontSize: 13 }}>{active.city}</div>
              </div>
              <div>
                <div className="label">Estado</div>
                <span className={`pill ${active.status === "comprador" ? "success" : active.status === "soporte" ? "warning" : "accent"}`}>
                  {active.status}
                </span>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div className="label" style={{ marginBottom: 8 }}>Acciones rápidas</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button className="btn">📞 Llamar</button>
                  <button className="btn">📋 Copiar datos envío</button>
                  <button className="btn">🏷️ Marcar como comprador</button>
                  <button className="btn danger">⛔ Bloquear</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
