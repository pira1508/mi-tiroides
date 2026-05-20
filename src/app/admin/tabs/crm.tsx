"use client";

import { useEffect, useRef, useState } from "react";

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

type Message = { from: "bot" | "cliente"; text: string; time: string };

function formatTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("es-CO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export function CRM() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingT, setLoadingT] = useState(true);
  const [sending, setSending] = useState(false);
  const [botPaused, setBotPaused] = useState<boolean>(false);
  const [togglingBot, setTogglingBot] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function cargarEstadoBot(phone: string) {
    try {
      const r = await fetch(`/api/admin/bot?telefono=${encodeURIComponent(phone)}`, { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setBotPaused(!!data.paused);
    } catch {}
  }

  async function pausarBot() {
    if (!activeId) return;
    setTogglingBot(true);
    try {
      const r = await fetch("/api/admin/bot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefono: activeId, action: "pause" }),
      });
      if (r.ok) setBotPaused(true);
    } finally {
      setTogglingBot(false);
    }
  }

  async function reanudarBot() {
    if (!activeId) return;
    setTogglingBot(true);
    try {
      const r = await fetch("/api/admin/bot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefono: activeId, action: "resume" }),
      });
      if (r.ok) {
        setBotPaused(false);
        // Refrescar mensajes para mostrar la respuesta automática que Camila acaba de mandar
        setTimeout(() => cargarMensajes(activeId, true), 800);
      }
    } finally {
      setTogglingBot(false);
    }
  }

  // Cargar bandeja
  async function cargarThreads() {
    try {
      const r = await fetch("/api/admin/conversaciones", { cache: "no-store" });
      if (!r.ok) return;
      const data = (await r.json()) as Thread[];
      setThreads(data);
    } finally {
      setLoadingT(false);
    }
  }

  useEffect(() => {
    cargarThreads();
    const t = setInterval(cargarThreads, 15000);
    return () => clearInterval(t);
  }, []);

  // Cargar mensajes del thread activo
  // initial=true → al abrir/cambiar thread, baja al fondo siempre.
  // initial=false → polling: solo baja si el usuario ya estaba al fondo (no
  // interrumpir si está leyendo arriba).
  async function cargarMensajes(phone: string, initial = false) {
    const r = await fetch(`/api/admin/conversaciones?telefono=${encodeURIComponent(phone)}`, { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as Message[];
    const el = scrollRef.current;
    const estabaAlFondo = el ? (el.scrollHeight - el.scrollTop - el.clientHeight) < 80 : true;
    setMessages(data);
    if (initial || estabaAlFondo) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    }
  }

  useEffect(() => {
    if (!activeId) return;
    cargarMensajes(activeId, true);
    cargarEstadoBot(activeId);
    const t = setInterval(() => cargarMensajes(activeId), 5000);
    return () => clearInterval(t);
  }, [activeId]);

  async function enviar() {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      const r = await fetch("/api/admin/conversaciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ telefono: activeId, texto: draft.trim() }),
      });
      if (r.ok) {
        setDraft("");
        await cargarMensajes(activeId, true);
      }
    } finally {
      setSending(false);
    }
  }

  const active = threads.find((t) => t.id === activeId);

  if (loadingT) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 60, textAlign: "center" }}>
          <div className="muted">Cargando bandeja…</div>
        </div>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
          <div className="h2" style={{ marginBottom: 6 }}>Aún no hay conversaciones</div>
          <div className="muted" style={{ fontSize: 13, maxWidth: 480, margin: "0 auto" }}>
            Cuando un cliente le escriba al bot por WhatsApp aparecerá acá.
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
            <span className="dot" /> WhatsApp · {threads.length}
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
                {t.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="chat-meta">
                <div className="chat-name">
                  <span>{t.name}</span>
                  <span className="chat-time">{formatTime(t.lastTime)}</span>
                </div>
                <div className="chat-preview">{t.lastMsg}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span className="muted" style={{ fontSize: 10 }}>{t.city}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversación */}
      <div className="crm-col">
        {active ? (
          <>
            <div className="card-header" style={{ borderRadius: 0 }}>
              <div className="chat-avatar" style={{ background: active.color, width: 30, height: 30 }}>
                {active.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <div className="h3">{active.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>{active.phone} · {active.city}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                <span className={`pill ${active.status === "comprador" ? "success" : active.status === "soporte" ? "warning" : "accent"}`}>
                  {active.status}
                </span>
                {botPaused ? (
                  <button
                    className="btn"
                    onClick={reanudarBot}
                    disabled={togglingBot}
                    style={{ background: "#16A34A", color: "#fff", fontSize: 12, padding: "5px 10px" }}
                    title="Camila lee el historial y envía la siguiente respuesta"
                  >
                    {togglingBot ? "..." : "▶ Activar bot"}
                  </button>
                ) : (
                  <button
                    className="btn"
                    onClick={pausarBot}
                    disabled={togglingBot}
                    style={{ background: "#DC2626", color: "#fff", fontSize: 12, padding: "5px 10px" }}
                    title="Detener respuestas automáticas de Camila"
                  >
                    {togglingBot ? "..." : "⏸ Pausar bot"}
                  </button>
                )}
              </div>
            </div>
            <div ref={scrollRef} style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
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
                placeholder="Escribir respuesta manual (saltea a Camila)..."
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
          </>
        ) : (
          <div style={{ padding: 60, textAlign: "center" }} className="muted">
            Seleccioná una conversación de la izquierda
          </div>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
