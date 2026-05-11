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

const SEED_THREADS: Thread[] = [];

const MOCK_MESSAGES: Record<string, { from: "bot" | "cliente"; text: string; time: string }[]> = {};

export function CRM() {
  const [threads] = useState(SEED_THREADS);
  const [activeId, setActiveId] = useState<string>("");
  const active = threads.find((t) => t.id === activeId);
  const messages = MOCK_MESSAGES[activeId] || [];

  if (threads.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
          <div className="h2" style={{ marginBottom: 6 }}>CRM WhatsApp · sin integración aún</div>
          <div className="muted" style={{ fontSize: 13, maxWidth: 480, margin: "0 auto" }}>
            Aquí verás las conversaciones reales del bot-confirmador con clientes.
            Pendiente: conectar API <code className="mono">/admin/conversaciones</code> del VPS.
          </div>
        </div>
      </div>
    );
  }

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
