"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (name: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void; page: () => void };
  }
}

type Opcion = { label: string; puntos: number };
type Pregunta = {
  id: string;
  titulo: string;
  subtitulo?: string;
  opciones: Opcion[];
};

const PREGUNTAS: Pregunta[] = [
  {
    id: "edad",
    titulo: "¿Cuál es tu rango de edad?",
    subtitulo: "Las hormonas tiroideas cambian con la edad",
    opciones: [
      { label: "18 a 30 años", puntos: 0 },
      { label: "31 a 45 años", puntos: 1 },
      { label: "46 a 55 años", puntos: 2 },
      { label: "56 años o más", puntos: 3 },
    ],
  },
  {
    id: "peso",
    titulo: "¿Has aumentado de peso sin razón aparente en los últimos meses?",
    subtitulo: "Aunque comes igual o incluso menos",
    opciones: [
      { label: "Sí, mucho", puntos: 3 },
      { label: "Algo notable", puntos: 2 },
      { label: "Muy poco", puntos: 1 },
      { label: "No", puntos: 0 },
    ],
  },
  {
    id: "cansancio",
    titulo: "¿Sientes cansancio extremo aunque duermas bien?",
    subtitulo: "Fatiga que no se quita con descanso",
    opciones: [
      { label: "Todos los días", puntos: 3 },
      { label: "Frecuentemente", puntos: 2 },
      { label: "A veces", puntos: 1 },
      { label: "Casi nunca", puntos: 0 },
    ],
  },
  {
    id: "cabello",
    titulo: "¿Notas caída de cabello o uñas quebradizas?",
    opciones: [
      { label: "Sí, ambos", puntos: 2 },
      { label: "Sólo caída de cabello", puntos: 1 },
      { label: "Sólo uñas débiles", puntos: 1 },
      { label: "No", puntos: 0 },
    ],
  },
  {
    id: "frio",
    titulo: "¿Sientes frío en manos y pies aún cuando hace calor?",
    subtitulo: "Tu metabolismo regula la temperatura corporal",
    opciones: [
      { label: "Siempre", puntos: 2 },
      { label: "A veces", puntos: 1 },
      { label: "Casi nunca", puntos: 0 },
    ],
  },
  {
    id: "diagnostico",
    titulo: "¿Te han diagnosticado hipotiroidismo o Hashimoto?",
    opciones: [
      { label: "Sí, confirmado", puntos: 3 },
      { label: "Sospecho pero no me han hecho exámenes", puntos: 1 },
      { label: "No", puntos: 0 },
    ],
  },
];

type Segmento = {
  emoji: string;
  titulo: string;
  color: string;
  descripcion: string;
  planRecomendado: "1" | "2" | "3";
};

function calcularSegmento(puntaje: number): Segmento {
  if (puntaje <= 4) {
    return {
      emoji: "🟢",
      titulo: "Alerta temprana",
      color: "#2f7a4a",
      descripcion:
        "Tu cuerpo está dando señales sutiles de desbalance tiroideo. Es el mejor momento para actuar antes de que avance — un tratamiento preventivo de 45 días puede regular tu metabolismo y evitar que los síntomas se acentúen.",
      planRecomendado: "1",
    };
  }
  if (puntaje <= 9) {
    return {
      emoji: "🟡",
      titulo: "Tiroides comprometida",
      color: "#c9a14a",
      descripcion:
        "Tus síntomas indican que tu tiroides ya está afectada y tu metabolismo está trabajando contra ti. Necesitas un tratamiento completo de 90 días para restaurar el funcionamiento normal y recuperar tu energía.",
      planRecomendado: "2",
    };
  }
  return {
    emoji: "🔴",
    titulo: "Estado crítico — tratamiento intensivo",
    color: "#b53b2a",
    descripcion:
      "Tu nivel de afectación es alto. Estás conviviendo con un hipotiroidismo activo que está deteriorando tu calidad de vida día a día. Necesitas el tratamiento profundo de 135 días para una recuperación sostenida.",
    planRecomendado: "3",
  };
}

const PLANES_INFO = {
  "1": { frascos: 1, dias: "45 DÍAS", precio: 89900, label: "1 Frasco" },
  "2": { frascos: 2, dias: "90 DÍAS · TRATAMIENTO COMPLETO", precio: 119900, label: "2 Frascos" },
  "3": { frascos: 3, dias: "135 DÍAS · 4,5 MESES", precio: 139900, label: "3 Frascos" },
};

type Estado = "intro" | "preguntas" | "loading" | "resultado";

export default function TestPage() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("intro");
  const [pregActual, setPregActual] = useState(0);
  const [respuestas, setRespuestas] = useState<number[]>([]);

  useEffect(() => {
    window.fbq?.("trackCustom", "QuizStarted");
    window.ttq?.track("ViewContent", { content_name: "quiz-tiroides" });
    fetch("/api/track-quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "started" }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (estado === "loading") {
      const t = setTimeout(() => setEstado("resultado"), 3200);
      return () => clearTimeout(t);
    }
  }, [estado]);

  const puntaje = respuestas.reduce((a, b) => a + b, 0);
  const segmento = calcularSegmento(puntaje);

  function responder(puntos: number) {
    const nuevas = [...respuestas, puntos];
    setRespuestas(nuevas);
    window.fbq?.("trackCustom", "QuizQuestionAnswered", {
      question_number: pregActual + 1,
      question_id: PREGUNTAS[pregActual].id,
    });
    if (pregActual + 1 >= PREGUNTAS.length) {
      const score = nuevas.reduce((a, b) => a + b, 0);
      window.fbq?.("trackCustom", "QuizCompleted", { score });
      window.ttq?.track("CompleteRegistration", { content_name: "quiz-tiroides", value: score });
      const seg = calcularSegmento(score);
      fetch("/api/track-quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "completed",
          score,
          segment: seg.titulo,
          plan: seg.planRecomendado,
          answers: nuevas,
        }),
      }).catch(() => {});
      setEstado("loading");
    } else {
      setPregActual(pregActual + 1);
    }
  }

  function volverPregunta() {
    if (pregActual === 0) {
      setEstado("intro");
      return;
    }
    setRespuestas(respuestas.slice(0, -1));
    setPregActual(pregActual - 1);
  }

  function irAlCheckout() {
    window.fbq?.("track", "InitiateCheckout", {
      content_ids: [`mi-tiroides-${segmento.planRecomendado}-frascos`],
      content_type: "product",
      value: PLANES_INFO[segmento.planRecomendado].precio,
      currency: "COP",
      num_items: PLANES_INFO[segmento.planRecomendado].frascos,
    });
    fetch("/api/track-quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "result_click",
        score: puntaje,
        segment: segmento.titulo,
        plan: segmento.planRecomendado,
        answers: respuestas,
      }),
    }).catch(() => {});
    window.fbq?.("trackCustom", "QuizResultClick", {
      score: puntaje,
      plan: segmento.planRecomendado,
    });
    router.push(`/v2?plan=${segmento.planRecomendado}&from=quiz&score=${puntaje}`);
  }

  return (
    <main className="quiz-main">
      <div className="quiz-shell">
        {estado === "intro" && <Intro onStart={() => setEstado("preguntas")} />}
        {estado === "preguntas" && (
          <Preguntas
            pregunta={PREGUNTAS[pregActual]}
            indice={pregActual}
            total={PREGUNTAS.length}
            onResponder={responder}
            onVolver={volverPregunta}
          />
        )}
        {estado === "loading" && <Loading />}
        {estado === "resultado" && (
          <Resultado
            segmento={segmento}
            puntaje={puntaje}
            maxPuntaje={16}
            plan={PLANES_INFO[segmento.planRecomendado]}
            onComprar={irAlCheckout}
          />
        )}
      </div>

      <style jsx global>{`
        body { background: #f5efe2; }
      `}</style>
      <style jsx>{`
        .quiz-main {
          min-height: 100vh;
          background: linear-gradient(180deg, #f5efe2 0%, #ebe2cc 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .quiz-shell {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 12px 40px rgba(31, 61, 43, 0.12);
          overflow: hidden;
          min-height: 560px;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </main>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="intro">
      <div className="badge">🦋 MI TIROIDES</div>
      <h1>
        Test de 60 segundos:<br />
        <span>¿Qué tan comprometida está tu tiroides?</span>
      </h1>
      <p className="lead">
        Responde 6 preguntas y descubre tu nivel de afectación tiroidea y qué plan necesitas para recuperarte.
      </p>
      <ul className="benef">
        <li>⚡ Resultado personalizado en 60 segundos</li>
        <li>🔒 100% privado y anónimo</li>
        <li>👩 +10.247 mujeres ya lo hicieron</li>
      </ul>
      <button className="btn-primario" onClick={onStart}>
        Empezar test gratis →
      </button>
      <p className="legal">Basado en marcadores clínicos de hipotiroidismo de la SEEN (Sociedad Española de Endocrinología y Nutrición)</p>

      <style jsx>{`
        .intro {
          padding: 36px 28px 28px;
          text-align: center;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .badge {
          display: inline-block;
          background: #1f3d2b;
          color: #fff;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
          margin: 0 auto 24px;
        }
        h1 {
          font-size: 26px;
          line-height: 1.25;
          color: #1f3d2b;
          margin: 0 0 16px;
          font-weight: 800;
        }
        h1 span {
          color: #2f5a3f;
        }
        .lead {
          color: #555;
          font-size: 15px;
          margin: 0 0 24px;
        }
        .benef {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
          text-align: left;
          display: inline-block;
        }
        .benef li {
          font-size: 14px;
          padding: 8px 0;
          color: #333;
        }
        .btn-primario {
          background: #1f3d2b;
          color: #fff;
          border: none;
          padding: 18px 24px;
          border-radius: 14px;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: transform 0.15s, background 0.2s;
        }
        .btn-primario:hover { background: #2f5a3f; }
        .btn-primario:active { transform: scale(0.98); }
        .legal {
          font-size: 11px;
          color: #888;
          margin: 16px 0 0;
        }
      `}</style>
    </div>
  );
}

function Preguntas({
  pregunta,
  indice,
  total,
  onResponder,
  onVolver,
}: {
  pregunta: Pregunta;
  indice: number;
  total: number;
  onResponder: (puntos: number) => void;
  onVolver: () => void;
}) {
  return (
    <div className="preg">
      <div className="top">
        <button className="back" onClick={onVolver} aria-label="Volver">←</button>
        <div className="contador">
          Pregunta {indice + 1} de {total}
        </div>
      </div>
      <div className="bar-wrap">
        <div className="bar" style={{ width: `${((indice + 1) / total) * 100}%` }} />
      </div>
      <div className="cuerpo">
        <h2>{pregunta.titulo}</h2>
        {pregunta.subtitulo && <p className="sub">{pregunta.subtitulo}</p>}
        <div className="opciones">
          {pregunta.opciones.map((op, i) => (
            <button key={i} className="opcion" onClick={() => onResponder(op.puntos)}>
              {op.label}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        .preg {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .top {
          display: flex;
          align-items: center;
          padding: 16px 20px 0;
        }
        .back {
          background: transparent;
          border: none;
          font-size: 22px;
          color: #1f3d2b;
          cursor: pointer;
          padding: 4px 10px;
          margin-right: 8px;
        }
        .contador {
          font-size: 13px;
          color: #6a6a6a;
          font-weight: 600;
        }
        .bar-wrap {
          height: 4px;
          background: #ebe2cc;
          margin: 12px 20px 0;
          border-radius: 999px;
          overflow: hidden;
        }
        .bar {
          height: 100%;
          background: #1f3d2b;
          transition: width 0.3s ease;
        }
        .cuerpo {
          padding: 32px 24px 28px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        h2 {
          font-size: 22px;
          line-height: 1.3;
          color: #1c1c1c;
          margin: 0 0 8px;
          font-weight: 700;
        }
        .sub {
          color: #6a6a6a;
          font-size: 14px;
          margin: 0 0 24px;
        }
        .opciones {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: auto;
        }
        .opcion {
          background: #fff;
          border: 2px solid #ebe2cc;
          color: #1c1c1c;
          padding: 18px 20px;
          border-radius: 14px;
          font-size: 16px;
          font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
        }
        .opcion:hover {
          border-color: #1f3d2b;
          background: #f5efe2;
        }
        .opcion:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}

function Loading() {
  const [msg, setMsg] = useState(0);
  const mensajes = [
    "Analizando tus respuestas...",
    "Cruzando con datos de 10.247 mujeres colombianas...",
    "Evaluando 17 marcadores de afectación tiroidea...",
    "Preparando tu plan personalizado...",
  ];
  useEffect(() => {
    const t = setInterval(() => setMsg((m) => Math.min(m + 1, mensajes.length - 1)), 800);
    return () => clearInterval(t);
  }, [mensajes.length]);

  return (
    <div className="loading">
      <div className="spinner" />
      <p className="msg">{mensajes[msg]}</p>
      <style jsx>{`
        .loading {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
        }
        .spinner {
          width: 64px;
          height: 64px;
          border: 5px solid #ebe2cc;
          border-top-color: #1f3d2b;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
          margin-bottom: 28px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .msg {
          font-size: 16px;
          color: #1f3d2b;
          font-weight: 600;
          min-height: 48px;
          transition: opacity 0.3s;
        }
      `}</style>
    </div>
  );
}

function Resultado({
  segmento,
  puntaje,
  maxPuntaje,
  plan,
  onComprar,
}: {
  segmento: Segmento;
  puntaje: number;
  maxPuntaje: number;
  plan: typeof PLANES_INFO["1"];
  onComprar: () => void;
}) {
  const pct = Math.round((puntaje / maxPuntaje) * 100);

  return (
    <div className="result">
      <div className="cabecera" style={{ background: segmento.color }}>
        <div className="emoji-grande">{segmento.emoji}</div>
        <h2>Tu tiroides está</h2>
        <h1>{segmento.titulo.toUpperCase()}</h1>
      </div>

      <div className="cuerpo">
        <div className="meter">
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${pct}%`, background: segmento.color }} />
          </div>
          <div className="meter-label">
            Puntaje: <strong>{puntaje}/{maxPuntaje}</strong> ({pct}% de afectación)
          </div>
        </div>

        <p className="descripcion">{segmento.descripcion}</p>

        <div className="plan-box" style={{ borderColor: segmento.color }}>
          <div className="plan-tag" style={{ background: segmento.color }}>
            PLAN RECOMENDADO PARA TI
          </div>
          <h3>📦 {plan.label} MI TIROIDES</h3>
          <p className="plan-dias">⏱️ {plan.dias}</p>
          <p className="plan-precio">
            <strong>${plan.precio.toLocaleString("es-CO")}</strong> COP
          </p>
          <button className="btn-comprar" style={{ background: segmento.color }} onClick={onComprar}>
            Quiero mi tratamiento →
          </button>
          <p className="garantia">🔒 Pago contraentrega · Solo pagas al recibir</p>
        </div>

        <div className="trust">
          <p>✅ Garantía de satisfacción 60 días</p>
          <p>🚚 Envío gratis a toda Colombia</p>
          <p>📞 Asesoría WhatsApp gratis</p>
        </div>
      </div>

      <style jsx>{`
        .result {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .cabecera {
          padding: 32px 24px 24px;
          text-align: center;
          color: #fff;
        }
        .emoji-grande {
          font-size: 48px;
          margin-bottom: 8px;
        }
        .cabecera h2 {
          font-size: 14px;
          margin: 0 0 4px;
          font-weight: 500;
          letter-spacing: 2px;
          opacity: 0.9;
        }
        .cabecera h1 {
          font-size: 22px;
          margin: 0;
          font-weight: 800;
          line-height: 1.2;
        }
        .cuerpo {
          padding: 24px 22px 28px;
          flex: 1;
        }
        .meter {
          margin-bottom: 20px;
        }
        .meter-track {
          height: 10px;
          background: #ebe2cc;
          border-radius: 999px;
          overflow: hidden;
        }
        .meter-fill {
          height: 100%;
          transition: width 0.8s ease;
        }
        .meter-label {
          font-size: 13px;
          color: #6a6a6a;
          margin-top: 8px;
          text-align: center;
        }
        .descripcion {
          font-size: 15px;
          color: #333;
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .plan-box {
          border: 2px solid;
          border-radius: 16px;
          padding: 28px 20px 24px;
          text-align: center;
          position: relative;
          margin-bottom: 20px;
          background: #fff;
        }
        .plan-tag {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          letter-spacing: 1px;
          white-space: nowrap;
        }
        .plan-box h3 {
          font-size: 20px;
          margin: 0 0 8px;
          color: #1f3d2b;
        }
        .plan-dias {
          font-size: 12px;
          color: #6a6a6a;
          margin: 0 0 12px;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .plan-precio {
          font-size: 28px;
          margin: 0 0 18px;
          color: #1f3d2b;
        }
        .btn-comprar {
          color: #fff;
          border: none;
          padding: 18px 24px;
          border-radius: 12px;
          font-size: 17px;
          font-weight: 700;
          width: 100%;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .btn-comprar:active { transform: scale(0.98); }
        .garantia {
          font-size: 12px;
          color: #6a6a6a;
          margin: 12px 0 0;
        }
        .trust {
          text-align: center;
          padding-top: 12px;
          border-top: 1px solid #ebe2cc;
        }
        .trust p {
          font-size: 13px;
          color: #6a6a6a;
          margin: 8px 0;
        }
      `}</style>
    </div>
  );
}
