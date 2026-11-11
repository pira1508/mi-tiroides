"use client";

// ============================================================
// /ec · MI TIROIDES para ECUADOR (11-nov-2026)
// ============================================================
// Parte de /v6b (la landing a la que apuntan los ganadores de MT) con los
// cambios del informe «MT en Ecuador»:
//   - precios en USD (34,90 / 49,90 / 64,90), pago contra entrega en todo Ecuador;
//   - provincias y ciudad/cantón; celular 09… de 10 dígitos;
//   - sin INVIMA, sin Rappi, sin cifras sin fuente, sin «Hecho en Colombia»;
//   - copy en «aporta» / «apoya» (norma ARCSA 028-2016: nada de cura, trata,
//     desinflama, deshincha);
//   - sin testimonios: no hay clientas ecuatorianas todavía y no se inventan;
//   - sin garantía de devolución ni asistente por WhatsApp hasta definir la
//     operación de Ecuador;
//   - pedidos a /api/pedido-ec → CRM separado (no Hoko, no Camila).
// La tiroides siempre como glándula, nunca mariposa. Dosis: 2 cápsulas con el desayuno.
// ============================================================

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { leerTracking, useCapturarTrackingOnMount } from "../_use-tracking";
import {
  PROVINCIAS_EC,
  NOMBRES_PROVINCIAS_EC,
  PRECIOS_EC,
  sanitizarTelefonoEC,
  esCelularECValido,
  formatearTelefonoEC,
  usd,
  WHATSAPP_EC,
} from "../ecuador";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (name: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void; page: () => void };
  }
}

type Cantidad = "1" | "2" | "3";
const DIAS: Record<Cantidad, string> = { "1": "45 días", "2": "90 días", "3": "135 días" };
const SUB: Record<Cantidad, string> = {
  "1": "precio por frasco",
  "2": "el 2.º frasco a US$15",
  "3": `${usd(PRECIOS_EC["3"].precio / 3)} por frasco`,
};
const AUTOSAVE_KEY = "mit_ec_form_v1";
const CONTENT_NAME = "MI TIROIDES Ecuador";

const ANGULOS = {
  pastilla: {
    h1: "Su pastilla repone la hormona. ¿Y los nutrientes que usa su tiroides?",
    sub:
      "Se toma la levotiroxina todos los días, sin falta, y aun así se siente cansada, pesada o hinchada. La pastilla le da la hormona, pero no el selenio, el zinc ni la L-tirosina que su tiroides usa para funcionar. MI TIROIDES los aporta juntos, en 2 cápsulas con el desayuno.",
  },
  hinchada: {
    h1: "Come igual que siempre y amanece hinchada y pesada.",
    sub:
      "Muchas mujeres con la tiroides lenta lo viven así: cara y párpados hinchados al despertar, cuerpo pesado y cansancio desde temprano. MI TIROIDES aporta 6 nutrientes que su tiroides usa —selenio, zinc, L-tirosina, yodo, B12 y D3— para apoyar su funcionamiento normal.",
  },
} as const;
type Angulo = keyof typeof ANGULOS;

const INGREDIENTES = [
  { n: "Selenio", d: "200 mcg", foto: "/img/ing-selenio.webp", t: "Su cuerpo lo usa en la conversión de T4 (la hormona de su pastilla) a T3, la forma activa." },
  { n: "Zinc", d: "15 mg", foto: "/img/ing-zinc.webp", t: "Participa junto con el selenio en el funcionamiento normal de la tiroides." },
  { n: "L-Tirosina", d: "500 mg", foto: "/img/ing-tirosina.webp", t: "El aminoácido a partir del cual se forman las hormonas tiroideas." },
  { n: "Vitamina B12", d: "500 mcg", foto: "/img/ing-b12.webp", t: "Participa en el metabolismo energético normal." },
  { n: "Vitamina D3", d: "2000 UI", foto: "/img/ing-d3.webp", t: "Contribuye al funcionamiento normal del sistema inmune." },
  { n: "Yodo", d: "150 mcg", foto: "/img/ing-yodo.webp", t: "En dosis diaria segura: la tiroides lo usa para formar sus hormonas." },
];

export default function Page() {
  useCapturarTrackingOnMount();
  const [angulo, setAngulo] = useState<Angulo>("pastilla");
  const [cantidad, setCantidad] = useState<Cantidad>("2");
  const [modalOpen, setModalOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [pedido, setPedido] = useState<{ id: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [provincia, setProvincia] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("angle");
    if (a === "pastilla" || a === "hinchada") setAngulo(a);
  }, []);

  // Restaurar borrador al abrir el formulario
  useEffect(() => {
    if (!modalOpen) return;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.ts && Date.now() - d.ts < 24 * 3600 * 1000) {
        if (d.nombre) setNombre(d.nombre);
        if (d.telefono) setTelefono(d.telefono);
        if (d.provincia) setProvincia(d.provincia);
        if (d.ciudad) setCiudad(d.ciudad);
        if (d.direccion) setDireccion(d.direccion);
        if (d.referencia) setReferencia(d.referencia);
      }
    } catch {}
  }, [modalOpen]);

  // Autoguardado + aviso de formulario a medias (8 s sin cambios)
  useEffect(() => {
    if (!modalOpen || ok) return;
    if (!nombre && !telefono && !direccion) return;
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ nombre, telefono, provincia, ciudad, direccion, referencia, ts: Date.now() }));
    } catch {}
    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    if (esCelularECValido(telefono) && nombre.trim().length >= 2) {
      abandonTimer.current = setTimeout(() => {
        try {
          const blob = new Blob([JSON.stringify({
            tipo: "abandono_form",
            nombre: nombre.trim(),
            telefono: sanitizarTelefonoEC(telefono),
            provincia: provincia || null,
            ciudad: ciudad || null,
            direccion: direccion || null,
            referencia: referencia || null,
            cantidad,
            ...leerTracking(),
          })], { type: "application/json" });
          navigator.sendBeacon?.("/api/pedido-ec", blob);
        } catch {}
      }, 8000);
    }
    return () => { if (abandonTimer.current) clearTimeout(abandonTimer.current); };
  }, [modalOpen, ok, nombre, telefono, provincia, ciudad, direccion, referencia, cantidad]);

  const plan = PRECIOS_EC[cantidad];
  const contentId = `mi-tiroides-ec-${cantidad}-frascos`;

  function openModal() {
    setOk(false);
    setError(null);
    setModalOpen(true);
    window.fbq?.("track", "InitiateCheckout", {
      value: plan.precio, currency: "USD", content_ids: [contentId], content_name: CONTENT_NAME,
      content_type: "product", num_items: plan.frascos,
    });
    window.gtag?.("event", "begin_checkout", { value: plan.precio, currency: "USD" });
    window.ttq?.track("InitiateCheckout", {
      value: plan.precio, currency: "USD", content_id: contentId, content_type: "product",
      content_name: CONTENT_NAME, quantity: plan.frascos,
    });
  }

  const formValido =
    esCelularECValido(telefono) &&
    nombre.trim().length >= 3 &&
    !!provincia &&
    ciudad.trim().length >= 2 &&
    direccion.trim().length >= 6 &&
    referencia.trim().length >= 4;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!esCelularECValido(telefono)) { setError("Escriba su celular de Ecuador: 10 dígitos que empiezan en 09."); return; }
    if (nombre.trim().length < 3) { setError("Escriba su nombre completo."); return; }
    if (!provincia || ciudad.trim().length < 2) { setError("Elija su provincia y escriba su ciudad o cantón."); return; }
    if (direccion.trim().length < 6) { setError("Escriba su dirección completa."); return; }
    if (referencia.trim().length < 4) { setError("Escriba el barrio o sector y una referencia para el repartidor."); return; }

    setEnviando(true);
    const empresa = ((e.currentTarget as HTMLFormElement).querySelector("input[name='empresa']") as HTMLInputElement | null)?.value || "";
    const data = {
      nombre: nombre.trim(),
      telefono: sanitizarTelefonoEC(telefono),
      provincia,
      ciudad: ciudad.trim(),
      direccion: direccion.trim(),
      referencia: referencia.trim(),
      cantidad,
      empresa,
      ...leerTracking(),
    };
    window.fbq?.("track", "Lead", { value: plan.precio, currency: "USD", content_ids: [contentId], content_name: CONTENT_NAME });
    window.gtag?.("event", "generate_lead", { value: plan.precio, currency: "USD" });
    window.ttq?.track("SubmitForm", { value: plan.precio, currency: "USD", content_id: contentId, content_name: CONTENT_NAME });

    let id = `EC-${Date.now().toString(36).toUpperCase()}`;
    let registrado = false;
    try {
      const res = await fetch("/api/pedido-ec", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true,
      });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.id) id = j.id;
        registrado = true;
        if (j?.valido === true) {
          window.fbq?.("track", "Purchase", {
            value: plan.precio, currency: "USD", content_ids: [contentId], content_name: CONTENT_NAME,
            content_type: "product", num_items: plan.frascos,
          }, { eventID: id });
          window.gtag?.("event", "purchase", { value: plan.precio, currency: "USD", transaction_id: id });
          window.ttq?.track("CompletePayment", {
            value: plan.precio, currency: "USD", content_id: contentId, content_type: "product",
            content_name: CONTENT_NAME, quantity: plan.frascos,
          }, { event_id: id });
        }
      }
    } catch {}
    if (!registrado) {
      try {
        navigator.sendBeacon?.("/api/pedido-ec", new Blob([JSON.stringify(data)], { type: "application/json" }));
        registrado = true;
      } catch {}
    }
    if (registrado) {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
      setPedido({ id, total: plan.precio });
      setOk(true);
    } else {
      setError("No pudimos registrar su pedido. Intente de nuevo en un momento.");
    }
    setEnviando(false);
  }

  const sugerencias = provincia ? PROVINCIAS_EC[provincia] || [] : [];

  return (
    <>
      <div className="marquee">
        <div className="marquee-track">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i}>✦ Envío gratis a todo Ecuador &nbsp;&nbsp; ✦ Paga en efectivo cuando le llega &nbsp;&nbsp;</span>
          ))}
        </div>
      </div>

      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">MI TIROIDES</div>
          <div className="nav-links">
            <a href="#ingredientes">Ingredientes</a>
            <a href="#como-se-toma">Cómo se toma</a>
            <a href="#faq">Preguntas</a>
          </div>
          <button className="nav-cta" onClick={openModal}>Pedir ahora</button>
        </div>
      </nav>

      {/* HERO */}
      <section>
        <div className="container hero v6b-hero">
          <div className="v6b-hero-media">
            <div className="hero-img">
              <Image src="/img/ec-bundle-1.webp" alt="Frasco de MI TIROIDES Avanzado, 90 cápsulas vegetales" width={600} height={600} priority />
            </div>
          </div>
          <div>
            <h1 className="h1">{ANGULOS[angulo].h1}</h1>
            <div className="rating-row">
              <span className="stars">★★★★★</span>
              <span><strong>Más de 6.600 pedidos entregados en Colombia.</strong> Ahora llega a Ecuador.</span>
            </div>
            <p className="v6b-sub" style={{ color: "var(--gris)", fontSize: 16, margin: "0 0 12px" }}>
              {ANGULOS[angulo].sub} <strong>Va con su pastilla, no la reemplaza.</strong>
            </p>

            <div className="v6b-oferta" role="radiogroup" aria-label="Elija su presentación">
              {(["1", "2", "3"] as Cantidad[]).map((k) => {
                const p = PRECIOS_EC[k];
                const sel = cantidad === k;
                return (
                  <button type="button" key={k} className={`v6b-opcion ${sel ? "selected" : ""}`} onClick={() => setCantidad(k)} aria-pressed={sel}>
                    {k === "2" && <span className="v6b-tag">MÁS ELEGIDO</span>}
                    {k === "3" && <span className="v6b-tag gold">MÁS RINDE</span>}
                    <span className="v6b-op-frascos">{p.frascos} {p.frascos === 1 ? "frasco" : "frascos"}</span>
                    <span className="v6b-op-dias">{DIAS[k]}</span>
                    <span className="v6b-op-precio">{usd(p.precio)}</span>
                    <span className="v6b-op-sub">{SUB[k]}</span>
                  </button>
                );
              })}
            </div>

            <button className="btn btn-block v6b-cta" onClick={openModal}>
              Pedir ahora · paga al recibir
              <span>{plan.label} · {usd(plan.precio)} · envío gratis</span>
            </button>
            <div className="hero-checks">
              <div>No paga nada hoy: paga en efectivo cuando lo recibe</div>
              <div>Envío gratis a todo Ecuador</div>
              <div>Le confirmamos la entrega por WhatsApp</div>
              <div>Va con su pastilla, no la reemplaza</div>
            </div>
            <div className="badges">
              <span className="badge">Suplemento alimenticio</span>
              <span className="badge">6 nutrientes</span>
              <span className="badge">Cápsula vegetal</span>
              <span className="badge">Sin gluten</span>
            </div>
            <div className="badges" style={{ marginBottom: 12 }} role="group" aria-label="¿Qué la trajo aquí?">
              {(["pastilla", "hinchada"] as Angulo[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setAngulo(k)}
                  className="badge"
                  style={{ cursor: "pointer", ...(angulo === k ? { background: "#1f3d2b", color: "#fff", borderColor: "#1f3d2b" } : {}) }}
                >
                  {k === "pastilla" ? "Tomo mi pastilla y sigo igual" : "Amanezco hinchada"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ¿LE SUENA FAMILIAR? */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">¿Le suena familiar?</div>
          <h2 className="h2">Se toma su pastilla todos los días, sin falta…<br />y aun así se siente igual</h2>
          <div className="dolor-grid">
            {[
              ["💧", "Amanece hinchada", "La cara y los párpados hinchados al despertar, y las piernas pesadas en la tarde."],
              ["🥱", "Cansancio desde temprano", "Se levanta cansada y a media tarde ya no tiene fuerzas, aunque durmió."],
              ["🤰", "El estómago inflado", "La ropa le aprieta cada vez más aunque no coma de más."],
              ["🧠", "La mente lenta", "Olvida cosas y le cuesta concentrarse."],
              ["🥶", "Frío en manos y pies", "Siente frío cuando los demás están bien."],
              ["💇‍♀️", "El pelo se le cae", "Encuentra pelo en la almohada, el cepillo y la ducha."],
            ].map(([emoji, t, d]) => (
              <div key={t} className="dolor-card">
                <div className="dolor-emoji">{emoji}</div>
                <div>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", maxWidth: 640, margin: "14px auto 0", fontSize: 16 }}>
            Su pastilla repone la hormona. <strong>Lo que no trae son los nutrientes que su tiroides usa todos los días.</strong>
          </p>
        </div>
      </section>

      {/* POR QUÉ */}
      <section className="section">
        <div className="container-sm">
          <div className="eyebrow">Lo que casi nadie le explica</div>
          <h2 className="h2">La levotiroxina y los nutrientes hacen trabajos distintos</h2>
          <p className="lead">
            La levotiroxina (Eutirox y similares) le da a su cuerpo la hormona T4. Para usarla, el cuerpo la convierte
            en T3, y en ese proceso <strong>participan el selenio y el zinc</strong>. La tiroides, además, forma sus
            hormonas a partir de <strong>L-tirosina y yodo</strong>.
          </p>
          <p className="lead">
            MI TIROIDES aporta esos nutrientes juntos, más B12 y D3, en una sola toma con el desayuno. No es un
            medicamento ni reemplaza su tratamiento: <strong>va con su pastilla, no la reemplaza.</strong>
          </p>
        </div>
      </section>

      {/* FÓRMULA */}
      <section className="section section-verde" id="ingredientes">
        <div className="container">
          <div className="eyebrow">La fórmula</div>
          <h2 className="h2">6 nutrientes en cada toma</h2>
          <p className="lead">Dosis por porción diaria de 2 cápsulas.</p>
          <div className="ing-grid">
            {INGREDIENTES.map((ing) => (
              <div key={ing.n} className="ing-card" style={{ cursor: "default" }}>
                <div className="ing-foto">
                  <Image src={ing.foto} alt={ing.n} width={400} height={400} />
                </div>
                <h3>{ing.n}</h3>
                <div className="dose">{ing.d}</div>
                <p>{ing.t}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "#d6cdb3", marginTop: 28, fontSize: 14 }}>
            Cápsula vegetal · Sin azúcar · Sin colorantes · Sin gluten
          </p>
        </div>
      </section>

      {/* CÓMO SE TOMA */}
      <section className="section" id="como-se-toma">
        <div className="container">
          <div className="eyebrow">Cómo se toma</div>
          <h2 className="h2">2 cápsulas con el desayuno. Nada más.</h2>
          <div className="beneficio-grid">
            {[
              { tag: "En ayunas", t: "Primero su pastilla", d: "Tómese la levotiroxina como se la indicó su médico, en ayunas." },
              { tag: "Con el desayuno", t: "Después, MI TIROIDES", d: "2 cápsulas con el primer alimento del día, así no se cruza con su pastilla." },
              { tag: "Todos los días", t: "Sin falta", d: "Los nutrientes se toman de forma continua. Si un día se le olvida, siga al día siguiente con su desayuno." },
              { tag: "Cada frasco", t: "90 cápsulas · 45 días", d: "2 frascos alcanzan para 3 meses, el tiempo que recomendamos tomarlo seguido." },
            ].map((b) => (
              <div key={b.t} className="beneficio-card">
                <div className="beneficio-tag">{b.tag}</div>
                <h3>{b.t}</h3>
                <p>{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-beige" id="faq">
        <div className="container-sm">
          <div className="eyebrow">Preguntas frecuentes</div>
          <h2 className="h2">Resolvemos sus dudas</h2>
          <div className="faq">
            <details>
              <summary>¿Lo puedo tomar con mi Eutirox o levotiroxina?</summary>
              <p>Sí. MI TIROIDES va con su pastilla, no la reemplaza. Tome su pastilla en ayunas y MI TIROIDES con el desayuno. Ante cualquier duda, consulte a su médico.</p>
            </details>
            <details>
              <summary>¿Es un medicamento?</summary>
              <p>No. Es un suplemento alimenticio: aporta nutrientes que su tiroides usa. No reemplaza ningún tratamiento médico.</p>
            </details>
            <details>
              <summary>¿Cómo pago?</summary>
              <p>En efectivo, cuando el pedido le llega a la casa. No paga nada por adelantado.</p>
            </details>
            <details>
              <summary>¿Cuánto cuesta el envío y cuánto se demora?</summary>
              <p>El envío es gratis a todo Ecuador. Después de su pedido le escribimos por WhatsApp para confirmar la dirección y la fecha de entrega.</p>
            </details>
            <details>
              <summary>¿Cómo se toma?</summary>
              <p>2 cápsulas al día con el desayuno. Cada frasco trae 90 cápsulas y alcanza para 45 días.</p>
            </details>
            <details>
              <summary>¿Qué diferencia tiene con un multivitamínico?</summary>
              <p>Un multivitamínico trae un poco de todo. MI TIROIDES reúne en una sola toma los nutrientes que usa la tiroides: selenio 200 mcg, zinc, L-tirosina y yodo, más B12 y D3.</p>
            </details>
            <details>
              <summary>¿Tiene efectos secundarios?</summary>
              <p>Usa dosis diarias seguras. Si está embarazada o lactando, o tiene una enfermedad renal o hepática, consulte a su médico antes de tomarlo.</p>
            </details>
            <details>
              <summary>¿Es una suscripción?</summary>
              <p>No. Es una compra única. Usted decide cuándo volver a pedir.</p>
            </details>
            <details>
              <summary>¿Lo pueden tomar los hombres?</summary>
              <p>Sí. Los nutrientes son los mismos para hombres y mujeres.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CIERRE */}
      <section className="section section-verde">
        <div className="container-sm" style={{ textAlign: "center" }}>
          <h2 className="h2">¿Lista para empezar?</h2>
          <p style={{ color: "#d6cdb3", marginBottom: 26 }}>Paga en efectivo cuando lo recibe. Envío gratis a todo Ecuador.</p>
          <button className="btn btn-light" onClick={openModal}>Pedir mi MI TIROIDES →</button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          Suplemento alimenticio · Notificación Sanitaria ARCSA N.° [PENDIENTE] · No es un medicamento · Va con su pastilla, no la reemplaza
          <br />
          Este producto no reemplaza el tratamiento médico. Consulte a su médico.
        </div>
      </footer>

      {!modalOpen && (
        <div className="v6b-sticky">
          <div className="v6b-sticky-info">
            <strong>{plan.label} · {usd(plan.precio)}</strong>
            Paga al recibir · Envío gratis
          </div>
          <button className="btn" onClick={openModal}>Pedir ahora</button>
        </div>
      )}
      <div className="v6b-spacer" />

      {/* MODAL DE COMPRA */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModalOpen(false)} aria-label="Cerrar">×</button>
            <div className="modal-head">
              <div className="modal-logo">
                <strong>MI TIROIDES</strong>
                <span>Avanzado · Suplemento alimenticio</span>
              </div>
              <div className="modal-trustline">
                <span>💵 Paga al recibir</span>
                <span>🚚 Envío gratis</span>
                <span>💊 Va con su pastilla</span>
              </div>
            </div>

            {ok && pedido ? (
              <div className="modal-success" style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 6 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#1f3d2b" }}>¡Pedido recibido!</h3>
                <p style={{ color: "var(--gris)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Le escribimos por WhatsApp para confirmar la dirección y la fecha de entrega.
                </p>
                <div style={{ background: "rgba(31, 61, 43, 0.06)", borderRadius: 10, padding: "12px 14px", margin: "0 0 16px", fontSize: 14, lineHeight: 1.6, color: "#1f3d2b", textAlign: "left" }}>
                  <div><strong>Número de pedido:</strong> <code style={{ fontFamily: "monospace" }}>{pedido.id}</code></div>
                  <div><strong>Total a pagar al recibir:</strong> {usd(pedido.total)}</div>
                </div>
                {WHATSAPP_EC && (
                  <a
                    className="btn btn-block"
                    href={`https://wa.me/${WHATSAPP_EC}?text=${encodeURIComponent(`Hola, acabo de hacer mi pedido de MI TIROIDES (${pedido.id}). Quiero confirmarlo.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", marginBottom: 10 }}
                  >
                    Confirmar por WhatsApp (opcional)
                  </a>
                )}
                <button className="btn btn-ghost btn-block" onClick={() => setModalOpen(false)}>Listo, cerrar</button>
              </div>
            ) : (
              <>
                <div className="modal-planes">
                  {(["1", "2", "3"] as Cantidad[]).map((k) => {
                    const p = PRECIOS_EC[k];
                    const sel = cantidad === k;
                    return (
                      <button type="button" key={k} className={`modal-plan ${sel ? "selected" : ""}`} onClick={() => setCantidad(k)}>
                        {k === "2" && <div className="modal-plan-tag">MÁS ELEGIDO</div>}
                        <div className="modal-plan-img">
                          <Image src="/img/ec-bundle-1.webp" alt={p.label} width={300} height={300} />
                        </div>
                        <div className="modal-plan-title">{p.label} <small>({DIAS[k]})</small></div>
                        <div className="modal-plan-precio">{usd(p.precio)}</div>
                        <div className="modal-plan-perdia">{SUB[k]}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="modal-section-title">Método de envío</div>
                <div className="modal-shipping">
                  <span className="modal-radio active" />
                  <strong>Envío a domicilio</strong>
                  <span style={{ marginLeft: "auto", color: "var(--gris)" }}>Gratis</span>
                </div>

                <div className="modal-section-title green">Sus datos de entrega</div>
                <form className="modal-form" onSubmit={onSubmit} noValidate>
                  <input type="text" name="empresa" defaultValue="" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
                  <label>
                    <span className="modal-label">Celular (WhatsApp) <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>📞</span>
                      <input name="telefono" required placeholder="099 123 4567" inputMode="tel" autoComplete="tel-national"
                        value={telefono} onChange={(e) => setTelefono(formatearTelefonoEC(e.target.value))} />
                    </div>
                    <small>A este número le confirmamos la entrega</small>
                  </label>
                  <label>
                    <span className="modal-label">Nombre completo <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>👤</span>
                      <input name="nombre" required placeholder="Nombre y apellido" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                    </div>
                  </label>
                  <label>
                    <span className="modal-label">Provincia <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>📍</span>
                      <select required value={provincia} onChange={(e) => { setProvincia(e.target.value); setCiudad(""); }}>
                        <option value="">Elija su provincia</option>
                        {NOMBRES_PROVINCIAS_EC.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </label>
                  <label>
                    <span className="modal-label">Ciudad o cantón <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🏙️</span>
                      <input name="ciudad" required list="ec-ciudades" disabled={!provincia} autoComplete="address-level2"
                        placeholder={provincia ? "Escriba su ciudad o cantón" : "Primero elija la provincia"}
                        value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
                      <datalist id="ec-ciudades">
                        {sugerencias.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </label>
                  <label>
                    <span className="modal-label">Dirección <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🏠</span>
                      <input name="direccion" required placeholder="Calle principal, número y calle secundaria" autoComplete="street-address"
                        value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                    </div>
                  </label>
                  <label>
                    <span className="modal-label">Barrio o sector y referencia <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🧭</span>
                      <input name="referencia" required placeholder="Ej.: Ciudadela Alborada, junto a la farmacia"
                        value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                    </div>
                  </label>

                  <div className="modal-summary">
                    <div className="modal-summary-row"><span>Subtotal</span><span>{usd(plan.precio)}</span></div>
                    <div className="modal-summary-row"><span>Envío</span><span>Gratis</span></div>
                    <div className="modal-summary-divider" />
                    <div className="modal-summary-row total"><span>Total a pagar al recibir</span><strong>{usd(plan.precio)}</strong></div>
                  </div>

                  <div style={{ background: "rgba(31, 61, 43, 0.06)", borderRadius: 8, padding: "10px 12px", fontSize: 13, textAlign: "center", color: "#1f3d2b", lineHeight: 1.5, margin: "4px 0 8px" }}>
                    📦 No paga nada ahora. Le llega a su casa y paga en efectivo cuando lo recibe.
                  </div>

                  {error && (
                    <div style={{ background: "#fdecea", border: "1px solid #f5b7b1", color: "#a93226", padding: "10px 12px", borderRadius: 8, fontSize: 14, textAlign: "center" }}>
                      {error}
                    </div>
                  )}

                  <button className="btn btn-block modal-confirm" type="submit" disabled={enviando || !formValido}
                    title={!formValido ? "Complete todos los campos para continuar" : undefined}>
                    {enviando ? "Enviando…" : (
                      <>
                        PEDIR AHORA — PAGO AL RECIBIR
                        <br />
                        <span style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>{usd(plan.precio)} · Envío gratis</span>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
