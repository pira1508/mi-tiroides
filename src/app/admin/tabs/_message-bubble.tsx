"use client";

import { useState } from "react";

export type ChatMessage = {
  from: "bot" | "cliente" | "user" | "operador";
  text: string;
  time: string;
  mediaArchivo?: string | null;
  mediaMime?: string | null;
  transcripcion?: string | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function esAudio(mime?: string | null) { return !!mime && mime.startsWith("audio/"); }
function esImagen(mime?: string | null) { return !!mime && mime.startsWith("image/"); }
function esVideo(mime?: string | null) { return !!mime && mime.startsWith("video/"); }

// Texto plano cuando ya no querés mostrar el "[Audio del cliente]:" arriba del player
// porque tenemos la transcripción separada.
function limpiarPrefijoMedia(text: string) {
  return text
    .replace(/^\[Audio del cliente\]:\s*/i, "")
    .replace(/^\[El cliente envió una imagen\.\s*/i, "")
    .replace(/^\[Video del cliente con texto\]:\s*/i, "")
    .replace(/\]\s*$/, "")
    .trim();
}

export function MessageBubble({ m, esEnviadoPorBot }: { m: ChatMessage; esEnviadoPorBot: boolean }) {
  const [expandTranscripcion, setExpandTranscripcion] = useState(false);
  const hasMedia = !!m.mediaArchivo;
  const TRANSCRIPCION_PREVIEW_CHARS = 80;
  const mediaUrl = m.mediaArchivo ? `/api/admin/media/${encodeURIComponent(m.mediaArchivo)}` : null;

  // Cuando hay media, el texto suele venir como "[Audio del cliente]: ..." — lo escondemos
  // y mostramos solo la transcripción (que ya está en m.transcripcion) más limpia.
  const textoLimpio = hasMedia ? limpiarPrefijoMedia(m.text) : m.text;
  const mostrarTextoSeparado = hasMedia && textoLimpio && textoLimpio !== (m.transcripcion || "");

  const bubbleStyle: React.CSSProperties = {
    background: esEnviadoPorBot ? "var(--brand-soft, #DCF8C6)" : "var(--panel-sub, #fff)",
    color: esEnviadoPorBot ? "var(--brand-ink, #222)" : "var(--text, #222)",
    padding: hasMedia ? "6px" : "8px 12px",
    borderRadius: 10,
    borderTopRightRadius: esEnviadoPorBot ? 2 : 10,
    borderTopLeftRadius: esEnviadoPorBot ? 10 : 2,
    fontSize: 13,
    whiteSpace: "pre-wrap",
    border: "1px solid var(--border, #E0E0E0)",
    maxWidth: "100%",
  };

  return (
    <div style={{ alignSelf: esEnviadoPorBot ? "flex-end" : "flex-start", maxWidth: "85%" }}>
      <div style={bubbleStyle}>
        {/* IMAGEN */}
        {hasMedia && esImagen(m.mediaMime) && mediaUrl && (
          <a href={mediaUrl} target="_blank" rel="noopener" style={{ display: "block" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl}
              alt="Imagen del cliente"
              style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 6, display: "block" }}
            />
          </a>
        )}

        {/* VIDEO */}
        {hasMedia && esVideo(m.mediaMime) && mediaUrl && (
          <video src={mediaUrl} controls style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 6, display: "block" }} />
        )}

        {/* AUDIO */}
        {hasMedia && esAudio(m.mediaMime) && mediaUrl && (
          <audio src={mediaUrl} controls preload="metadata" style={{ width: "100%", display: "block", marginBottom: m.transcripcion ? 4 : 0 }} />
        )}

        {/* TRANSCRIPCIÓN / DESCRIPCIÓN debajo del media — con "Ver más" si es larga */}
        {hasMedia && m.transcripcion && (
          <div style={{ padding: "4px 6px 2px", fontSize: 11.5, color: "var(--text-sub, #555)", lineHeight: 1.4, fontStyle: "italic" }}>
            {(() => {
              const t = m.transcripcion;
              const corta = t.length <= TRANSCRIPCION_PREVIEW_CHARS;
              if (corta || expandTranscripcion) {
                return (
                  <>
                    {t}
                    {!corta && (
                      <button
                        onClick={() => setExpandTranscripcion(false)}
                        style={btnVerMas}
                      >Ver menos</button>
                    )}
                  </>
                );
              }
              return (
                <>
                  {t.slice(0, TRANSCRIPCION_PREVIEW_CHARS)}…{" "}
                  <button
                    onClick={() => setExpandTranscripcion(true)}
                    style={btnVerMas}
                  >Ver más</button>
                </>
              );
            })()}
          </div>
        )}

        {/* CAPTION/TEXTO ADICIONAL (cuando hay media + texto extra que no es la transcripción) */}
        {mostrarTextoSeparado && (
          <div style={{ padding: hasMedia ? "4px 6px" : 0, fontSize: 13 }}>{textoLimpio}</div>
        )}

        {/* TEXTO NORMAL (sin media) */}
        {!hasMedia && <>{m.text}</>}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-muted, #888)", marginTop: 2, textAlign: esEnviadoPorBot ? "right" : "left" }}>
        {formatTime(m.time)}
      </div>
    </div>
  );
}

const btnVerMas: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--brand-ink, #1565C0)",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  padding: "0 2px",
  textDecoration: "underline",
  fontStyle: "normal",
};
