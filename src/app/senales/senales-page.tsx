"use client";

// Prelandings «Funnel 4 señales» (11-nov-2026). Una sola plantilla, 4 configs.
// Oferta, precios, formulario, píxeles, tracking y /api/pedido = los de /v6b (copiados
// sin cambios de comportamiento). Solo cambia el origen: `landing` = origin de la ruta.

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { DEPARTAMENTOS, NOMBRES_DEPARTAMENTOS } from "../colombia";
import { leerTracking, useCapturarTrackingOnMount } from "../_use-tracking";

// === Helpers de formulario (idénticos a v6b) ===
function sanitizarTelefonoCO(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("57")) d = d.slice(2);
  return d;
}
function esCelularCOValido(raw: string): boolean {
  const d = sanitizarTelefonoCO(raw);
  return /^3\d{9}$/.test(d);
}
function formatearTelefono(raw: string): string {
  const d = sanitizarTelefonoCO(raw).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

const AUTOSAVE_KEY = "mit_form_autosave_v1";
type FormDraft = {
  nombre?: string;
  telefono?: string;
  direccion?: string;
  referencia?: string;
  departamento?: string;
  ciudad?: string;
  cantidad?: string;
  ts?: number;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (name: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void; page: () => void };
  }
}

// Misma tabla de precios que v6b (la API la resuelve a v1 para estos orígenes).
const PLANES = {
  "1": { dias: "45 DÍAS", frascos: 1, label: "1 Frasco", precio: 89900, original: 89900, perDia: 1998, tag: null as null | { texto: string; gold?: boolean } },
  "2": { dias: "90 DÍAS · TRATAMIENTO COMPLETO", frascos: 2, label: "2 Frascos", precio: 119900, original: 179800, perDia: 1332, tag: { texto: "EL MÁS COMPRADO · 8 DE CADA 10", gold: false } },
  "3": { dias: "135 DÍAS · 4,5 MESES", frascos: 3, label: "3 Frascos", precio: 139900, original: 269700, perDia: 1036, tag: { texto: "EL MÁS BARATO · $1.036/DÍA", gold: true } },
} as const;
type Cantidad = keyof typeof PLANES;

// === Señales: textos compartidos por las 4 páginas ===
// Verbatims = mensajes reales de clientas (los que están citados en cada CARTA.txt), sin nombre.
type SenalId = "hinchazon" | "cansancio" | "unas" | "pelo";

const SENALES: Record<SenalId, { titulo: string; desc: string; icono: string; verbatims: string[] }> = {
  hinchazon: {
    titulo: "Se hincha: cara, manos y pies",
    desc: "Amanece con la cara y los párpados hinchados, y en la tarde los zapatos le aprietan. No es grasa: es agua que el cuerpo retiene.",
    icono: "💧",
    verbatims: [
      "«Las manos aún están hinchadas, mis pies las medidas le aprietan y mi cara aún sigue hinchada».",
      "«Amanezco a veces así hinchona y un poco los ojos cargados».",
    ],
  },
  cansancio: {
    titulo: "Cansancio que no se va",
    desc: "Duerme y aun así a las 3 de la tarde se le cierran los ojos. El tinto la acelera pero no la despierta.",
    icono: "🥱",
    verbatims: [
      "«Pero estoy muy cansada, me cuesta dormir bien tengo sobre peso y mi cara está más llena de lo habitual».",
      "«Aunque he tenido la tiroides controlada por los exámenes igual siento mucho cansancio, mal humor, ansias».",
    ],
  },
  unas: {
    titulo: "Uñas que se parten",
    desc: "Mete las manos al agua caliente y se le parte una uña. Los esmaltes y las cremas no la cambian.",
    icono: "💅",
    verbatims: [
      "«Las uñas se me parten muchísimo».",
      "«Se me quiebra las uñas, sin energía».",
    ],
  },
  pelo: {
    titulo: "Se le cae el pelo",
    desc: "Mechones en el cepillo, en la almohada y en el desagüe de la ducha. El champú no lo frena.",
    icono: "🪮",
    verbatims: [
      "«Se me cae bastante el cabello, se me reseca la piel».",
      "«Se me está cayendo exageradamente el cabello».",
    ],
  },
};
const ORDEN_SENALES: SenalId[] = ["hinchazon", "cansancio", "unas", "pelo"];

export type Config = {
  senal: SenalId;
  origin: string; // valor de `variant`/landing que recibe /api/pedido
  h1: string;
  sub: string;
  fotos: { src: string; alt: string }[]; // 3 fotos del ad de esta señal (a, b, c)
  historia: string[]; // carta de Gloria, condensada desde CARTA.txt
  probe: string[]; // «Lo que probé»
  recorrido: { tag: string; t: string; d: string }[]; // timeline honesto
  limite: string;
  cierreSenal: string; // frase de cierre de la señal propia
};

const DISCLAIMER = "Historia ilustrativa basada en mensajes reales de clientas.";

const NUTRIENTES = [
  { n: "Selenio", d: "200 mcg" },
  { n: "Yodo", d: "150 mcg" },
  { n: "Zinc", d: "15 mg" },
  { n: "L-Tirosina", d: "500 mg" },
  { n: "Vitamina B12", d: "500 mcg" },
  { n: "Vitamina D3", d: "2000 UI" },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "¿Es otro de esos suplementos de TikTok?",
    a: (<>No. MI TIROIDES tiene <strong>registro INVIMA</strong>, se fabrica en Colombia bajo Buenas Prácticas y se paga <strong>contra entrega</strong>. Si en <strong>90 días desde que lo recibe</strong> no nota el cambio, le devolvemos la plata. Sin devolver el frasco, sin preguntas.</>),
  },
  {
    q: "¿Lo puedo tomar con mi Eutirox / levotiroxina?",
    a: (<>Sí. <strong>Apoya, no reemplaza.</strong> Toma tu pastilla en ayunas y MI TIROIDES con el desayuno, para que no se interfieran. Ante cualquier duda, consulta a tu médico.</>),
  },
  {
    q: "¿Qué lo diferencia de un multivitamínico?",
    a: (<>Un multivitamínico reparte un poco de todo. Este trae <strong>dosis específicas para la tiroides</strong>: selenio 200 mcg, yodo 150 mcg, zinc, L-tirosina, B12 y D3, en una sola cápsula.</>),
  },
  {
    q: "¿Cuándo veo resultados?",
    a: (<>La mayoría de clientas reporta cambios entre la 4.ª y 6.ª semana, y se ven con más claridad entre el 2.º y 3.er mes. Por eso lo presentamos como un tratamiento de 3 meses.</>),
  },
  {
    q: "¿Tiene efectos secundarios?",
    a: (<>La fórmula usa dosis fisiológicas seguras. Si tienes una condición renal, hepática o estás embarazada, consulta con tu médico antes de comenzar.</>),
  },
  {
    q: "¿Es una suscripción?",
    a: (<>No. Es una compra única. Tú decides cuándo volver a pedir. Sin cargos automáticos. Pagas contra entrega cuando el producto llega a tu puerta.</>),
  },
  {
    q: "¿Cómo se toma?",
    a: (<>2 cápsulas al día con el desayuno, media hora después de la pastilla. Cada frasco trae 90 cápsulas, alcanza para 45 días. 2 frascos = 90 días = el tratamiento completo de 3 meses.</>),
  },
  {
    q: "¿Tiene registro INVIMA?",
    a: (<>Sí. MI TIROIDES Avanzado cuenta con registro INVIMA y se fabrica en Colombia bajo Buenas Prácticas de Manufactura.</>),
  },
  {
    q: "¿Sirve si mi problema es más estrés que tiroides?",
    a: (<>El estrés crónico drena el selenio, zinc y B12 que la tiroides necesita. MI TIROIDES repone esos nutrientes. No es un ansiolítico. Combínalo con sueño y respiración para resultados más rápidos.</>),
  },
];

export default function SenalesPage({ config }: { config: Config }) {
  useCapturarTrackingOnMount();
  const { origin } = config;
  const senalPropia = SENALES[config.senal];
  const signsOrdenadas = [config.senal, ...ORDEN_SENALES.filter((s) => s !== config.senal)] as SenalId[];

  const [cantidad, setCantidad] = useState<Cantidad>("2");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ id: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [depto, setDepto] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [ciudadInput, setCiudadInput] = useState("");
  const [ciudadFocus, setCiudadFocus] = useState(false);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track view (1 vez por pageload), igual que v6b
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tipo: "view" }),
    }).catch(() => {});
  }, []);

  // Restore del borrador al abrir el modal (igual que v6b)
  useEffect(() => {
    if (!modalOpen) return;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const d: FormDraft = JSON.parse(raw);
      if (d.ts && Date.now() - d.ts < 24 * 60 * 60 * 1000) {
        if (d.nombre) setNombre(d.nombre);
        if (d.telefono) setTelefono(d.telefono);
        if (d.direccion) setDireccion(d.direccion);
        if (d.referencia) setReferencia(d.referencia);
        if (d.departamento) setDepto(d.departamento);
        if (d.ciudad) { setCiudad(d.ciudad); setCiudadInput(d.ciudad); }
      }
    } catch {}
  }, [modalOpen]);

  // Autosave + abandono (beacon a /api/pedido con el origen de esta página)
  useEffect(() => {
    if (!modalOpen) return;
    if (!nombre && !telefono && !direccion) return;
    const draft: FormDraft = {
      nombre, telefono, direccion, referencia,
      departamento: depto, ciudad, cantidad, ts: Date.now(),
    };
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft)); } catch {}

    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    if (esCelularCOValido(telefono) && nombre.trim().length >= 2) {
      abandonTimer.current = setTimeout(() => {
        const tel = sanitizarTelefonoCO(telefono);
        try {
          const tracking = leerTracking();
          const blob = new Blob([JSON.stringify({
            tipo: "abandono_form",
            nombre: nombre.trim(),
            telefono: tel,
            departamento: depto || null,
            ciudad: ciudad || null,
            direccion: direccion || null,
            cantidad,
            variant: origin,
            total: PLANES[cantidad].precio,
            ts: new Date().toISOString(),
            ...tracking,
          })], { type: "application/json" });
          navigator.sendBeacon?.("/api/pedido", blob);
        } catch {}
      }, 8000);
    }
    return () => {
      if (abandonTimer.current) clearTimeout(abandonTimer.current);
    };
  }, [modalOpen, nombre, telefono, direccion, referencia, depto, ciudad, cantidad, origin]);

  function openModal() {
    setOk(false);
    setError(null);
    setModalOpen(true);
    const value = PLANES[cantidad].precio;
    window.fbq?.("track", "InitiateCheckout", {
      value,
      currency: "COP",
      content_ids: [`mi-tiroides-${cantidad}-frascos`],
      content_type: "product",
      num_items: PLANES[cantidad].frascos,
    });
    window.gtag?.("event", "begin_checkout", { value, currency: "COP" });
    window.ttq?.track("InitiateCheckout", {
      value,
      currency: "COP",
      content_id: `mi-tiroides-${cantidad}-frascos`,
      content_type: "product",
      content_name: PLANES[cantidad].label,
      quantity: PLANES[cantidad].frascos,
    });
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tipo: "open_form" }),
    }).catch(() => {});
  }
  function closeModal() {
    setModalOpen(false);
  }

  function trackLead(value: number) {
    window.fbq?.("track", "Lead", {
      value,
      currency: "COP",
      content_ids: [`mi-tiroides-${cantidad}-frascos`],
      content_name: PLANES[cantidad].label,
    });
    window.gtag?.("event", "generate_lead", { value, currency: "COP" });
    window.ttq?.track("SubmitForm", {
      value,
      currency: "COP",
      content_id: `mi-tiroides-${cantidad}-frascos`,
      content_name: PLANES[cantidad].label,
    });
  }
  function trackPurchase(value: number, eventId: string) {
    window.fbq?.("track", "Purchase", {
      value,
      currency: "COP",
      content_ids: [`mi-tiroides-${cantidad}-frascos`],
      content_type: "product",
      num_items: PLANES[cantidad].frascos,
    }, { eventID: eventId });
    window.gtag?.("event", "purchase", { value, currency: "COP", transaction_id: eventId });
    window.ttq?.track("CompletePayment", {
      value,
      currency: "COP",
      content_id: `mi-tiroides-${cantidad}-frascos`,
      content_type: "product",
      content_name: PLANES[cantidad].label,
      quantity: PLANES[cantidad].frascos,
    }, { event_id: eventId });
  }

  const ciudadMatcheaDepto = !!depto && !!ciudad &&
    (DEPARTAMENTOS[depto] || []).some(
      (c) => c.toLowerCase().trim() === ciudad.toLowerCase().trim()
    );

  const formValido =
    esCelularCOValido(telefono) &&
    nombre.trim().length >= 3 &&
    direccion.trim().length >= 8 &&
    !!depto &&
    !!ciudad &&
    ciudadMatcheaDepto &&
    referencia.trim().length >= 5;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!esCelularCOValido(telefono)) {
      setError("Necesitamos tu celular Colombia (10 dígitos empezando en 3).");
      return;
    }
    if (!nombre.trim() || nombre.trim().length < 3) {
      setError("Escribe tu nombre completo.");
      return;
    }
    if (!direccion.trim() || direccion.trim().length < 8) {
      setError("Escribe tu dirección completa.");
      return;
    }
    if (!depto || !ciudad) {
      setError("Selecciona tu departamento y ciudad.");
      return;
    }
    if (!ciudadMatcheaDepto) {
      setError("La ciudad debe seleccionarse del listado del departamento. Si no aparece, escríbenos al WhatsApp.");
      return;
    }
    if (!referencia.trim() || referencia.trim().length < 5) {
      setError("Escribe el barrio y un punto de referencia para que el repartidor te encuentre.");
      return;
    }

    setEnviando(true);

    const telSanitizado = sanitizarTelefonoCO(telefono);
    const empresaHoneypot = ((e.currentTarget as HTMLFormElement)?.querySelector("input[name='empresa']") as HTMLInputElement | null)?.value || "";
    const formLoadedAt = typeof performance !== "undefined" && performance.timeOrigin ? Math.round(performance.timeOrigin) : Date.now();
    const tracking = leerTracking();
    const data = {
      nombre: nombre.trim(),
      telefono: telSanitizado,
      departamento: depto,
      ciudad,
      referencia: referencia.trim(),
      direccion: direccion.trim(),
      cantidad,
      variant: origin, // origen de la prelanding (CRM: landing = senales-hinchada | -cansada | -unas | -pelo)
      total: PLANES[cantidad as Cantidad].precio,
      empresa: empresaHoneypot,
      formLoadedAt,
      ...tracking,
    };
    const plan = PLANES[cantidad];
    const total = plan.precio;

    const fingerprint = `${data.telefono}-${cantidad}`;
    const lastKey = "mit_last_purchase";
    let alreadyFired = false;
    try {
      const raw = localStorage.getItem(lastKey);
      if (raw) {
        const last = JSON.parse(raw);
        if (last.fp === fingerprint && Date.now() - last.ts < 10 * 60 * 1000) {
          alreadyFired = true;
        }
      }
    } catch {}

    trackLead(total);

    let pedidoId = `MIT-${Date.now().toString(36).toUpperCase()}`;
    let registroOk = false;

    try {
      const res = await fetch("/api/pedido", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true,
      });
      if (res.ok) {
        let backendValido = false;
        try {
          const j = await res.clone().json();
          if (j?.id) pedidoId = j.id;
          backendValido = j?.valido === true;
        } catch {}
        registroOk = true;
        if (!alreadyFired && backendValido) {
          trackPurchase(total, pedidoId);
          try { localStorage.setItem(lastKey, JSON.stringify({ fp: fingerprint, ts: Date.now() })); } catch {}
        }
      } else {
        try {
          const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
          navigator.sendBeacon?.("/api/pedido", blob);
          registroOk = true;
        } catch {}
      }
    } catch {
      try {
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        navigator.sendBeacon?.("/api/pedido", blob);
        registroOk = true;
      } catch {}
    }

    if (registroOk) {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
      setPedidoConfirmado({ id: pedidoId, total });
      setOk(true);
    } else {
      setError("No pudimos registrar tu pedido. Intenta de nuevo o escríbenos por WhatsApp.");
    }
    setEnviando(false);
  }

  const plan = PLANES[cantidad];
  const fotoSenal = config.fotos[0];

  return (
    <>
      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-track">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i}>✦ Envío gratis en tu primer pedido &nbsp;&nbsp; ✦ Pago contra entrega &nbsp;&nbsp;</span>
          ))}
        </div>
      </div>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">MI TIROIDES</div>
          <div className="nav-links">
            <a href="#historia">Su historia</a>
            <a href="#senales">Señales</a>
            <a href="#faq">Preguntas</a>
          </div>
          <button className="nav-cta" onClick={openModal}>Pedir ahora</button>
        </div>
      </nav>

      {/* 1 · HOOK + GLORIA + FOTO */}
      <section>
        <div className="container hero v6b-hero">
          <div className="v6b-hero-media">
            <div className="hero-img">
              <Image src={fotoSenal.src} alt={fotoSenal.alt} width={900} height={1125} priority />
            </div>
            <div className="sen-gloria">Gloria, 54 años · Ibagué · toma su pastilla de la tiroides todos los días</div>
          </div>
          <div>
            <h1 className="h1">{config.h1}</h1>
            <div className="rating-row">
              <span className="stars">★★★★★</span>
              <span><strong>+6.600 pedidos entregados</strong> en 511 municipios de Colombia</span>
            </div>
            <p style={{ color: "var(--gris)", fontSize: 16, margin: "0 0 12px" }}>{config.sub}</p>

            <OfertaOpciones cantidad={cantidad} setCantidad={setCantidad} />

            <button className="btn btn-block v6b-cta" onClick={openModal}>
              Pedir ahora · paga al recibir
              <span>{plan.label} · ${plan.precio.toLocaleString("es-CO")} · envío gratis</span>
            </button>
            <div className="hero-checks">
              <div>No paga nada hoy: paga en efectivo cuando lo recibe</div>
              <div>Envío gratis a toda Colombia · llega en 1-3 días</div>
              <div><strong>Garantía de 90 días</strong> desde el día que lo recibe</div>
              <div>Va con su pastilla, no la reemplaza</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · LA HISTORIA DE GLORIA (carta) */}
      <section className="section section-beige" id="historia">
        <div className="container-sm">
          <div className="eyebrow">La historia de Gloria</div>
          <h2 className="h2">Ella hizo todo bien. Y aun así seguía igual.</h2>
          <div className="sen-carta">
            {config.historia.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="sen-disclaimer">{DISCLAIMER}</p>
        </div>
      </section>

      {/* 3 · NO SON 4 PROBLEMAS. ES UNO. */}
      <section className="section" id="senales">
        <div className="container">
          <div className="eyebrow">Las 4 señales</div>
          <h2 className="h2">No son 4 problemas. Es uno.</h2>
          <p className="lead">
            Hinchazón, pelo, cansancio y uñas. Cuando la tiroides va lenta y le faltan nutrientes,
            el cuerpo lo muestra por todos lados. Estas son las clientas que lo describieron con sus propias palabras:
          </p>

          <div className="sen-signs">
            {signsOrdenadas.map((id, idx) => {
              const s = SENALES[id];
              const propia = idx === 0;
              return (
                <div key={id} className={`sen-sign ${propia ? "propia" : ""}`}>
                  <div className="sen-sign-head">
                    <span className="sen-sign-icono" aria-hidden="true">{s.icono}</span>
                    <div>
                      {propia && <span className="sen-sign-tag">LA SUYA</span>}
                      <h3>{s.titulo}</h3>
                    </div>
                  </div>
                  <p>{s.desc}</p>
                  {(propia ? s.verbatims : s.verbatims.slice(0, 1)).map((v) => (
                    <blockquote key={v}>{v}<cite>Mensaje real de una clienta</cite></blockquote>
                  ))}
                  {propia && <p className="sen-sign-cierre">{config.cierreSenal}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4 · LO QUE PROBÓ */}
      <section className="section section-beige">
        <div className="container-sm">
          <div className="eyebrow">Lo que probó</div>
          <h2 className="h2">Ya probó de todo. Nada tocaba la causa.</h2>
          <ul className="sen-probe">
            {config.probe.map((p) => (
              <li key={p}><span aria-hidden="true">✕</span> {p}</li>
            ))}
          </ul>
          <p style={{ textAlign: "center", color: "var(--gris)", marginTop: 18 }}>
            Todo eso mira la superficie. Lo que faltaba estaba dentro del cuerpo.
          </p>
        </div>
      </section>

      {/* 5 · MECANISMO */}
      <section className="section section-verde">
        <div className="container">
          <div className="eyebrow">El mecanismo</div>
          <h2 className="h2">La pastilla repone la hormona. La tiroides necesita además 6 nutrientes.</h2>
          <p className="lead" style={{ color: "#d6cdb3" }}>
            La levotiroxina le repone la hormona, pero no le da a la tiroides lo que necesita para usarla.
            MI TIROIDES va con su pastilla: nunca la reemplaza.
          </p>
          <div className="sen-nutrientes">
            {NUTRIENTES.map((n) => (
              <div key={n.n} className="sen-nutriente">
                <strong>{n.d}</strong>
                <span>{n.n}</span>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "#d6cdb3", marginTop: 22, fontSize: 14 }}>
            Cápsula vegetal HPMC · Sin azúcar · Sin colorantes · Sin GMO · Vegano · Registro INVIMA
          </p>
        </div>
      </section>

      {/* 6 · COMPARATIVA CORTA */}
      <section className="section">
        <div className="container-sm">
          <div className="eyebrow">Comparado con lo que ya probó</div>
          <div className="sen-comp">
            <div className="sen-comp-row head">
              <span></span><span>Lo que ya probó</span><span>MI TIROIDES</span>
            </div>
            {[
              ["Repone la hormona", "Pastilla: sí", "Va con la pastilla"],
              ["Nutrientes para la tiroides", "No, o en dosis genéricas", "Selenio, yodo, zinc, L-tirosina, B12, D3"],
              ["Ataca la causa", "Solo el síntoma", "Apoya la conversión T4 → T3"],
              ["Cómo se paga", "Dinero por adelantado", "Contra entrega, con garantía de 90 días"],
            ].map(([a, b, c]) => (
              <div key={a} className="sen-comp-row">
                <span><strong>{a}</strong></span>
                <span className="sen-no">{b}</span>
                <span className="sen-si">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 · LA NOTA DE LA NEVERA */}
      <section className="section section-beige">
        <div className="container-sm">
          <div className="sen-nevera">
            <div className="sen-nevera-titulo">La nota de la nevera</div>
            <div className="sen-nevera-paso"><strong>1.</strong> Pastilla de la tiroides en ayunas, como siempre.</div>
            <div className="sen-nevera-paso"><strong>2.</strong> Media hora después, con el desayuno: <strong>2 cápsulas de MI TIROIDES.</strong></div>
            <div className="sen-nevera-nota">Si se le olvida un día, no pasa nada: retoma al día siguiente con el desayuno.</div>
          </div>
        </div>
      </section>

      {/* 8 · RECORRIDO REAL + LIMITACIÓN HONESTA */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Qué pasa, semana a semana</div>
          <h2 className="h2">Cambios reales, pero no de un día para otro</h2>
          <div className="sen-recorrido">
            {config.recorrido.map((r) => (
              <div key={r.tag} className="sen-rec-card">
                <div className="sen-rec-tag">{r.tag}</div>
                <h3>{r.t}</h3>
                <p>{r.d}</p>
              </div>
            ))}
          </div>
          <p className="sen-limite">
            <strong>Sin prometer nada:</strong> {config.limite}
          </p>
        </div>
      </section>

      {/* 9 · OFERTA (idéntica a v6b) */}
      <section className="section section-verde" id="comprar">
        <div className="container-sm" style={{ textAlign: "center" }}>
          <div className="eyebrow">Su tratamiento</div>
          <h2 className="h2">Elija su tratamiento</h2>
          <p style={{ color: "#d6cdb3", marginBottom: 20 }}>
            Envío gratis · Usted paga cuando lo recibe · Garantía de 90 días desde la entrega
          </p>
          <OfertaOpciones cantidad={cantidad} setCantidad={setCantidad} />
          <button className="btn btn-light" onClick={openModal} style={{ marginTop: 18 }}>
            Sí, quiero empezar mi cambio HOY · {plan.label} →
          </button>
          <p style={{ color: "#d6cdb3", marginTop: 16, fontSize: 14, fontStyle: "italic" }}>
            Pago contra entrega · Llega en 1-3 días · Garantía de 90 días desde la entrega
          </p>
        </div>
      </section>

      {/* 10 · FAQ */}
      <section className="section section-beige" id="faq">
        <div className="container-sm">
          <div className="eyebrow">Preguntas frecuentes</div>
          <h2 className="h2">Resolvemos sus dudas</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 11 · GARANTÍA + CIERRE */}
      <section className="section section-verde">
        <div className="container-sm" style={{ textAlign: "center" }}>
          <h2 className="h2">Si en 90 días no nota el cambio, le devolvemos la plata.</h2>
          <p style={{ color: "#d6cdb3", marginBottom: 26 }}>
            Más de 6.600 pedidos entregados en 511 municipios. Usted paga cuando lo recibe.
          </p>
          <button className="btn btn-light" onClick={openModal}>
            Sí, quiero empezar mi cambio HOY →
          </button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          MI TIROIDES Avanzado · Hecho en Colombia · Registro INVIMA
          <br />
          {DISCLAIMER}
          <br />
          Este producto no reemplaza el tratamiento médico. Consulta a tu profesional de salud.
        </div>
      </footer>

      {/* CTA flotante en mobile */}
      <button className="cta-float" onClick={openModal}>
        Pedir ahora · Pago contra entrega
      </button>

      {/* BARRA PEGAJOSA (móvil) */}
      {!modalOpen && (
        <div className="v6b-sticky">
          <div className="v6b-sticky-info">
            <strong>{plan.label} · ${plan.precio.toLocaleString("es-CO")}</strong>
            Paga al recibir · Garantía 90 días
          </div>
          <button className="btn" onClick={openModal}>Pedir ahora</button>
        </div>
      )}
      <div className="v6b-spacer" />

      {/* MODAL DE COMPRA (idéntico a v6b) */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Cerrar">×</button>

            <div className="modal-head">
              <div className="modal-logo">
                <strong>MI TIROIDES</strong>
                <span>Avanzado · Hecho en Colombia</span>
              </div>
              <div className="modal-pill">+6.600 pedidos entregados</div>
              <div className="modal-trustline">
                <span>💵 Paga al recibir</span>
                <span>🛡️ Garantía 90 días</span>
                <span>🇨🇴 Hecho en Colombia</span>
              </div>
              <div
                style={{
                  background: "rgba(31, 61, 43, .07)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginTop: 12,
                  fontSize: 13,
                  textAlign: "center",
                  color: "#1f3d2b",
                  lineHeight: 1.5,
                }}
              >
                🛡️ <strong>Garantía de 90 días desde el día que lo recibe.</strong>{" "}
                Si no nota el cambio, le devolvemos la plata. Y va con su pastilla, no la reemplaza.
              </div>
            </div>

            {ok && pedidoConfirmado ? (
              <div className="modal-success" style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 6 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#1f3d2b" }}>¡Pedido recibido!</h3>
                <p style={{ color: "var(--gris)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Le escribimos por WhatsApp en las próximas horas para confirmar la dirección y la fecha de entrega.
                </p>
                <div
                  style={{
                    background: "rgba(31, 61, 43, 0.06)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    margin: "0 0 16px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#1f3d2b",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <strong>Número de pedido:</strong>{" "}
                    <code style={{ fontFamily: "monospace" }}>{pedidoConfirmado.id}</code>
                  </div>
                  <div>
                    <strong>Total a pagar al recibir:</strong>{" "}
                    ${pedidoConfirmado.total.toLocaleString("es-CO")} COP
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--gris)", margin: "0 0 14px" }}>
                  ¿Quiere adelantar la confirmación? Escríbanos por WhatsApp con su número de pedido.
                </p>
                <a
                  className="btn btn-block"
                  href={`https://wa.me/573237451763?text=${encodeURIComponent(
                    `¡Hola! Soy ${nombre || "una clienta nueva"} y acabo de hacer mi pedido en MI TIROIDES.\n\n` +
                    `- ${cantidad} frasco${cantidad !== "1" ? "s" : ""}\n` +
                    `- $${pedidoConfirmado.total.toLocaleString("es-CO")} contra entrega\n` +
                    (ciudad ? `- ${ciudad}\n` : "") +
                    (direccion ? `- ${direccion}\n` : "") +
                    `\nQuiero confirmar mi pedido.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", marginBottom: 10 }}
                >
                  Confirmar por WhatsApp (opcional)
                </a>
                <button className="btn btn-ghost btn-block" onClick={closeModal}>
                  Listo, cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="modal-planes">
                  {(Object.keys(PLANES) as Cantidad[]).map((k) => {
                    const p = PLANES[k];
                    const sel = cantidad === k;
                    return (
                      <button
                        type="button"
                        key={k}
                        className={`modal-plan ${sel ? "selected" : ""}`}
                        onClick={() => setCantidad(k)}
                      >
                        {p.tag && (
                          <div className={`modal-plan-tag ${p.tag.gold ? "gold" : ""}`}>{p.tag.texto}</div>
                        )}
                        <div className="modal-plan-img">
                          <Image src={`/img/bundle-${p.frascos}.webp`} alt={p.label} width={300} height={300} />
                        </div>
                        <div className="modal-plan-title">
                          {p.label} <small>({p.frascos === 1 ? "45" : p.frascos === 2 ? "90" : "135"} días)</small>
                        </div>
                        {p.original > p.precio && (
                          <div className="modal-plan-tach">${p.original.toLocaleString("es-CO")}</div>
                        )}
                        <div className="modal-plan-precio">${p.precio.toLocaleString("es-CO")}</div>
                        <div className="modal-plan-perdia">${Math.round(p.perDia).toLocaleString("es-CO")} pesos día</div>
                      </button>
                    );
                  })}
                </div>

                <div className="modal-section-title">Método de envío</div>
                <div className="modal-shipping">
                  <span className="modal-radio active" />
                  <strong>Envío gratis</strong>
                  <span style={{ marginLeft: "auto", color: "var(--gris)" }}>Gratis</span>
                </div>

                <div className="modal-section-title green">Ingresa tu dirección de envío</div>
                <form className="modal-form" onSubmit={onSubmit} noValidate>
                  {/* honeypot anti-bot */}
                  <input type="text" name="empresa" defaultValue="" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
                  <label>
                    <span className="modal-label">WhatsApp <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>📞</span>
                      <input
                        name="telefono"
                        required
                        placeholder="311 389 2990"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={telefono}
                        onChange={(e) => setTelefono(formatearTelefono(e.target.value))}
                      />
                    </div>
                    <small>A este WhatsApp enviaremos tu guía de rastreo</small>
                  </label>

                  <label>
                    <span className="modal-label">Nombre completo <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>👤</span>
                      <input name="nombre" required placeholder="Laura Pérez" autoComplete="name"
                        value={nombre} onChange={(e) => setNombre(e.target.value)} />
                    </div>
                  </label>

                  <label>
                    <span className="modal-label">Dirección completa <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>📍</span>
                      <input name="direccion" required placeholder="Calle 122 #87-29 Apto 1302" autoComplete="street-address"
                        value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                    </div>
                  </label>

                  <label>
                    <span className="modal-label">Departamento <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🇨🇴</span>
                      <select
                        required
                        value={depto}
                        onChange={(e) => {
                          setDepto(e.target.value);
                          setCiudad("");
                          setCiudadInput("");
                        }}
                      >
                        <option value="">Selecciona tu departamento</option>
                        {NOMBRES_DEPARTAMENTOS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label style={{ position: "relative" }}>
                    <span className="modal-label">Ciudad <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🏙️</span>
                      <input
                        type="text"
                        required
                        placeholder={depto ? "Escribe tu ciudad…" : "Primero elige un departamento"}
                        disabled={!depto}
                        autoComplete="address-level2"
                        value={ciudadInput}
                        onChange={(e) => {
                          setCiudadInput(e.target.value);
                          setCiudad(e.target.value);
                          setCiudadFocus(true);
                        }}
                        onFocus={() => setCiudadFocus(true)}
                        onBlur={() => setTimeout(() => setCiudadFocus(false), 150)}
                      />
                    </div>
                    {depto && ciudadFocus && (() => {
                      const opciones = DEPARTAMENTOS[depto] || [];
                      const q = ciudadInput.trim().toLowerCase();
                      const filtradas = q ? opciones.filter((c) => c.toLowerCase().includes(q)) : opciones;
                      if (filtradas.length === 0) return null;
                      return (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            maxHeight: 200,
                            overflowY: "auto",
                            zIndex: 10,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                        >
                          {filtradas.slice(0, 12).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCiudad(c);
                                setCiudadInput(c);
                                setCiudadFocus(false);
                              }}
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 14px",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 15,
                                borderBottom: "1px solid #f1f1f1",
                              }}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </label>

                  <label>
                    <span className="modal-label">Barrio y punto de referencia <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🧭</span>
                      <input name="referencia" required placeholder="Ej: Barrio Cedritos, frente al ARA"
                        value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                    </div>
                  </label>

                  {/* ASISTENTE INCLUIDO */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f5efe2 0%, #ebe2cc 100%)",
                      border: "1px solid #c9a14a",
                      borderRadius: 12,
                      padding: "14px 14px 12px",
                      margin: "8px 0 4px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -10,
                        right: 12,
                        background: "#1f3d2b",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: ".5px",
                        padding: "3px 8px",
                        borderRadius: 4,
                      }}
                    >
                      INCLUIDO GRATIS
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 28, lineHeight: 1, marginTop: 2 }}>🌿</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1f3d2b", marginBottom: 2 }}>
                          Asistente personal de bienestar
                        </div>
                        <div style={{ fontSize: 12, color: "#5a5a5a", lineHeight: 1.45 }}>
                          Te acompaña durante todo tu tratamiento por WhatsApp:
                        </div>
                        <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#1f3d2b", lineHeight: 1.6 }}>
                          <li>Alimentos ideales para tu tiroides</li>
                          <li>Hábitos clave cada semana</li>
                          <li>Seguimiento de tu progreso</li>
                          <li>Resuelve dudas cuando quieras</li>
                          <li><strong>Precios especiales</strong> al renovar tu tratamiento</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="modal-summary">
                    <div className="modal-summary-row">
                      <span>Subtotal</span>
                      <span>${plan.precio.toLocaleString("es-CO")}</span>
                    </div>
                    <div className="modal-summary-row">
                      <span>Envío</span>
                      <span>Gratis</span>
                    </div>
                    <div className="modal-summary-divider" />
                    <div className="modal-summary-row total">
                      <span>Total</span>
                      <strong>${plan.precio.toLocaleString("es-CO")}</strong>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(31, 61, 43, 0.06)",
                      borderRadius: 8,
                      padding: "10px 12px",
                      fontSize: 13,
                      textAlign: "center",
                      color: "#1f3d2b",
                      lineHeight: 1.5,
                      margin: "4px 0 8px",
                    }}
                  >
                    📦 No paga nada ahora. Le llega a su casa y paga en efectivo cuando lo recibe.
                  </div>

                  {error && (
                    <div
                      style={{
                        background: "#fdecea",
                        border: "1px solid #f5b7b1",
                        color: "#a93226",
                        padding: "10px 12px",
                        borderRadius: 8,
                        fontSize: 14,
                        textAlign: "center",
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <button
                    className="btn btn-block modal-confirm"
                    type="submit"
                    disabled={enviando || !formValido}
                    title={!formValido ? "Completa todos los campos para continuar" : undefined}
                  >
                    {enviando ? "Enviando…" : (
                      <>
                        PEDIR AHORA — PAGO AL RECIBIR
                        <br />
                        <span style={{ fontSize: 13, opacity: .9, fontWeight: 500 }}>
                          ${plan.precio.toLocaleString("es-CO")} · Envío gratis · Garantía 90 días
                        </span>
                      </>
                    )}
                  </button>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                      marginTop: 12,
                      fontSize: 11,
                      color: "var(--gris)",
                      textAlign: "center",
                    }}
                  >
                    <div><div style={{ fontSize: 20 }}>💵</div>Pago contra entrega</div>
                    <div><div style={{ fontSize: 20 }}>🚚</div>Llega en 1-3 días</div>
                    <div><div style={{ fontSize: 20 }}>🇨🇴</div>Hecho en Colombia</div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Selector de 1/2/3 frascos (mismo markup que v6b, clases globales v6b-*)
function OfertaOpciones({ cantidad, setCantidad }: { cantidad: Cantidad; setCantidad: (c: Cantidad) => void }) {
  return (
    <div className="v6b-oferta" role="radiogroup" aria-label="Elija su tratamiento">
      {(Object.keys(PLANES) as Cantidad[]).map((k) => {
        const p = PLANES[k];
        const sel = cantidad === k;
        const porFrasco = Math.round(p.precio / p.frascos);
        return (
          <button
            type="button"
            key={k}
            className={`v6b-opcion ${sel ? "selected" : ""}`}
            onClick={() => setCantidad(k)}
            aria-pressed={sel}
          >
            {k === "2" && <span className="v6b-tag">MÁS ELEGIDO</span>}
            {k === "3" && <span className="v6b-tag gold">MÁS BARATO</span>}
            <span className="v6b-op-frascos">{p.frascos} {p.frascos === 1 ? "frasco" : "frascos"}</span>
            <span className="v6b-op-dias">{p.frascos === 1 ? "45 días" : p.frascos === 2 ? "90 días" : "135 días"}</span>
            <span className="v6b-op-precio">${p.precio.toLocaleString("es-CO")}</span>
            <span className="v6b-op-sub">
              {k === "1" ? "precio por frasco" : k === "2" ? "el 2.º frasco a $30.000" : `$${porFrasco.toLocaleString("es-CO")} por frasco`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
