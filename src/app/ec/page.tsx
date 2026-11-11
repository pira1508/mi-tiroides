"use client";

// ============================================================
// /ec · MI TIROIDES para ECUADOR · v2 (11-nov-2026)
// ============================================================
// Es la /v6b ganadora (misma estructura, mismos copys) con SOLO lo necesario
// para Ecuador: USD, provincias, celular 09…, sin palabras colombianas,
// ARCSA en lugar de INVIMA y claims reformulados según la norma ARCSA
// (nada de cura / trata / desinflama / deshincha: se describe el síntoma y
// se dice «aporta» / «participa»). Precios en src/app/ecuador.ts.
// Testimonios: mensajes REALES de clientas en Colombia (WhatsApp), rotulados
// como tales, sin fotos. Las fotos de clientas de v6b no se usan: entraron
// con el primer commit (7-may-2026), antes de la primera venta, así que no
// son de clientas. Las imágenes ec-*.webp son escenas generadas con
// Higgsfield (GPT Image 2.5), nunca rotuladas como clienta.
// Pedidos → /api/pedido-ec → CRM separado (sin Hoko, sin Camila).
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  PROVINCIAS_EC,
  NOMBRES_PROVINCIAS_EC,
  PRECIOS_EC,
  GARANTIA_EC,
  ASISTENTE_EC,
  sanitizarTelefonoEC,
  esCelularECValido,
  formatearTelefonoEC,
  usd,
} from "../ecuador";
import { leerTracking, useCapturarTrackingOnMount } from "../_use-tracking";

const AUTOSAVE_KEY = "mit_ec_form_v2";
const CONTENT_NAME = "MI TIROIDES Ecuador";
type FormDraft = {
  nombre?: string;
  telefono?: string;
  direccion?: string;
  referencia?: string;
  provincia?: string;
  ciudad?: string;
  cantidad?: string;
  ts?: number;
};

// Fisher-Yates shuffle determinístico por seed
function shuffleWithSeed<T>(array: readonly T[], seed: number): T[] {
  const result = [...array];
  let s = seed;
  const rng = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Primer slide del carrusel = hero DISEÑADO que hace message-match con cada ad (por ?angle).
// Avatar mujeres 45-55 (hinchazón/gordura por hipotiroidismo). 4 ángulos = los 4 ads:
// agua (ES AGUA NO ES USTED) · pastilla (SU PASTILLA NO TRABAJA SOLA) · secreto (EL SECRETO) · esponja (LA ESPONJA).
// 4 heroes diseñados message-match (Higgsfield nano_banana_pro, crema/verde/dorado + frasco real).
const HERO_MUJER: Record<"agua" | "pastilla" | "secreto" | "esponja", { src: string; alt: string }> = {
  agua: { src: "/img/ec-hero-espejo.webp", alt: "Amanece con la cara y los párpados hinchados aunque come igual que siempre" },
  pastilla: { src: "/img/ec-frasco-pastilla.webp", alt: "MI TIROIDES junto a su pastilla de la tiroides: va con ella, no la reemplaza" },
  secreto: { src: "/img/ec-hero-costa.webp", alt: "MI TIROIDES: 6 nutrientes que su tiroides usa, en 2 cápsulas al día" },
  esponja: { src: "/img/ec-sierra-desayuno.webp", alt: "2 cápsulas de MI TIROIDES con el desayuno, todos los días" },
};

// Escenas generadas para Ecuador (no son clientas) + el frasco.
const HERO_RESTO = [
  { src: "/img/ec-desayuno.webp", alt: "Desayuno con bolón, queso y café: 2 cápsulas de MI TIROIDES con el desayuno" },
  { src: "/img/ec-entrega.webp", alt: "Le llega a la puerta de su casa y paga en efectivo cuando lo recibe" },
  { src: "/img/bundle-2.webp", alt: "MI TIROIDES · tratamiento de 2 frascos (90 días)" },
];

const SIN_CARA = [
  {
    src: "/img/ec-desayuno.webp",
    titulo: "7:00 a.m. · Con el desayuno",
    momento: "Día 1",
    caption: "2 cápsulas con el desayuno: un bolón, un huevo, un café. El selenio y el zinc se absorben mejor con algo de grasa.",
  },
  {
    src: "/img/ec-frasco-pastilla.webp",
    titulo: "La toma diaria",
    momento: "Cada mañana",
    caption: "Su pastilla en ayunas; MI TIROIDES con el desayuno. Una sola toma al día, un solo frasco para todo.",
  },
  {
    src: "/img/ec-hero-costa.webp",
    titulo: "Lleva el frasco contigo",
    momento: "Si sales temprano",
    caption: "Cabe en la cartera. Si sale a trabajar antes de desayunar, se las toma allá con un café.",
  },
  {
    src: "/img/sincara-4.webp",
    titulo: "Domingo en familia",
    momento: "Día 14",
    caption: "Dos semanas sin fallar un día. Ya es parte de su mañana, como el café.",
  },
  {
    src: "/img/sincara-5.webp",
    titulo: "Marque su progreso",
    momento: "Día 30",
    caption: "Primer mes completo. Los nutrientes funcionan por acumulación: por eso la constancia importa más que la dosis.",
  },
  {
    src: "/img/sincara-6.webp",
    titulo: "Cierre su día",
    momento: "Día 60-90",
    caption: "El tratamiento completo: 2 frascos, 90 días. Es el tiempo que recomendamos para notar cómo se siente usted.",
  },
];

function Mark({ v }: { v: string }) {
  if (v === "yes") return <span className="mark mark-yes" aria-label="Sí">✓</span>;
  if (v === "no") return <span className="mark mark-no" aria-label="No">✕</span>;
  return <span className="mark mark-mid" aria-label="Parcial">~</span>;
}

type Ingrediente = {
  n: string;
  d: string;
  resumen: string;
  foto: string;
  porQue: string;
  evidencia: string[];
  fuentes: string;
};

const INGREDIENTES: Ingrediente[] = [
  {
    n: "Selenio",
    d: "200 mcg",
    resumen: "El mineral más estudiado en la tiroides.",
    foto: "/img/ing-selenio.webp",
    porQue:
      "El selenio forma parte de las enzimas glutatión-peroxidasa, que contribuyen a proteger las células del daño oxidativo. La tiroides es el órgano con más selenio de todo el cuerpo: lo usa todos los días.",
    evidencia: [
      "Es el mineral con más estudios en personas con tiroiditis de Hashimoto (meta-análisis 2024, 21 estudios, 1.610 personas).",
      "Pacientes con Hashimoto suelen tener niveles bajos de selenio en sangre.",
      "Forma óptima: L-selenometionina, ~90% de absorción intestinal.",
    ],
    fuentes: "Fuentes naturales: nueces de Brasil, atún, sardinas, huevo.",
  },
  {
    n: "Yodo",
    d: "150 mcg",
    resumen: "Sí trae yodo — la materia prima de T3 y T4 (muchos importados vienen sin él).",
    foto: "/img/ing-yodo.webp",
    porQue:
      "Sin yodo, la tiroides no puede fabricar las hormonas T3 y T4. La OMS recomienda 150 mcg/día. Pero ojo: en Hashimoto, dosis muy altas empeoran el cuadro — por eso usamos solo la dosis fisiológica segura.",
    evidencia: [
      "OMS recomienda 150 mcg/día para adultos.",
      "Dosis muy altas (>300 mcg) pueden empeorar Hashimoto.",
      "Forma óptima: yoduro de potasio, biodisponibilidad alta.",
    ],
    fuentes: "Fuentes naturales: sal yodada, pescado, algas.",
  },
  {
    n: "Zinc",
    d: "15 mg",
    resumen: "Participa en la conversión de T4 en T3.",
    foto: "/img/ing-zinc.webp",
    porQue:
      "T4 es la hormona de su pastilla; T3 es la forma activa que su cuerpo usa. Esa conversión depende de enzimas en las que participan el zinc y el selenio.",
    evidencia: [
      "Participa en la conversión periférica de T4 a T3.",
      "Sinergia comprobada con selenio.",
      "Forma óptima: zinc L-metionina o zinc glicinato (mejor absorción).",
    ],
    fuentes: "Fuentes naturales: ostras, carne roja, semillas de calabaza.",
  },
  {
    n: "L-Tirosina",
    d: "500 mg",
    resumen: "El aminoácido precursor de las hormonas tiroideas.",
    foto: "/img/ing-tirosina.webp",
    porQue:
      "T3 y T4 se construyen literalmente uniendo yodo a una molécula de tirosina. Es la materia prima de sus hormonas tiroideas.",
    evidencia: [
      "Aminoácido precursor directo de T3 y T4.",
      "Bien tolerada en dosis de 500 mg/día.",
      "También es precursora de la dopamina, relacionada con el ánimo y la concentración.",
    ],
    fuentes: "Fuentes naturales: huevos, lácteos, pollo, almendras.",
  },
  {
    n: "Vitamina B12",
    d: "500 mcg",
    resumen: "Participa en el metabolismo energético normal.",
    foto: "/img/ing-b12.webp",
    porQue:
      "Es frecuente que las personas con hipotiroidismo tengan la B12 baja. Esta vitamina participa en la producción de energía de las células y en el sistema nervioso.",
    evidencia: [
      "Frecuentemente baja en personas con hipotiroidismo.",
      "Contribuye al funcionamiento normal del sistema nervioso.",
      "Forma óptima: metilcobalamina (forma activa, no requiere conversión).",
    ],
    fuentes: "Fuentes naturales: carne, pescado, huevo, lácteos.",
  },
  {
    n: "Vitamina D3",
    d: "2000 UI",
    resumen: "Contribuye al funcionamiento normal del sistema inmune.",
    foto: "/img/ing-d3.webp",
    porQue:
      "La D3 participa en el funcionamiento normal del sistema inmune, que en la tiroiditis de Hashimoto es el que ataca a la glándula.",
    evidencia: [
      "En la región es frecuente tener niveles bajos, sobre todo en mujeres adultas que pasan el día bajo techo.",
      "Una de las vitaminas más estudiadas en enfermedades autoinmunes.",
      "Forma óptima: colecalciferol (D3) — más eficaz que ergocalciferol (D2).",
    ],
    fuentes: "Fuentes naturales: sol del mediodía 15 min, salmón, sardinas.",
  },
];

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (name: string, params?: Record<string, unknown>, options?: Record<string, unknown>) => void; page: () => void };
  }
}

const PLANES = {
  "1": {
    dias: "45 DÍAS",
    frascos: 1,
    label: PRECIOS_EC["1"].label,
    precio: PRECIOS_EC["1"].precio,
    original: PRECIOS_EC["1"].precio,
    perDia: PRECIOS_EC["1"].precio / 45,
    tag: null as null | { texto: string; gold?: boolean },
  },
  "2": {
    dias: "90 DÍAS · TRATAMIENTO COMPLETO",
    frascos: 2,
    label: PRECIOS_EC["2"].label,
    precio: PRECIOS_EC["2"].precio,
    original: PRECIOS_EC["1"].precio * 2,
    perDia: PRECIOS_EC["2"].precio / 90,
    tag: { texto: "EL MÁS COMPRADO · 8 DE CADA 10", gold: false },
  },
  "3": {
    dias: "135 DÍAS · 4,5 MESES",
    frascos: 3,
    label: PRECIOS_EC["3"].label,
    precio: PRECIOS_EC["3"].precio,
    original: PRECIOS_EC["1"].precio * 3,
    perDia: PRECIOS_EC["3"].precio / 135,
    tag: { texto: `EL MÁS BARATO · ${usd(PRECIOS_EC["3"].precio / 135)}/DÍA`, gold: true },
  },
} as const;

type Cantidad = keyof typeof PLANES;

// Mensajes REALES de clientas de MI TIROIDES en Colombia, copiados de su
// WhatsApp con Camila (CRM, tabla mensajes). Solo inicial del apellido y ciudad.
// No se editó el sentido; «…» marca un recorte.
const TESTI_CORTOS = [
  { foto: "NQ", nombre: "Nidia Q.", ciudad: "Neiva", texto: "Sí, muy muy bueno… voy a continuar con el tratamiento porque me ha servido bastante." },
  { foto: "RB", nombre: "Rosero B.", ciudad: "Ipiales", texto: "Gracias, sigo con el tratamiento, me siento muy bien." },
  { foto: "AQ", nombre: "Ángela Q.", ciudad: "Itagüí", texto: "…ya que me siento muy bien con MI TIROIDES." },
  { foto: "CA", nombre: "Carmen", ciudad: "Buenaventura", texto: "Sí, claro que me ha servido mucho, lo necesito…" },
];

const TESTI_LARGOS = [
  { foto: "CV", nombre: "Carolina V.", rol: "Cartagena, Colombia", texto: "Sí, me siento mejor. Compré el producto porque leí que había que complementar la levotiroxina con minerales, pero no quería tomar una pastilla de cada una, así que vi la fórmula que trae todas y me dije: esta es.", tag: "Va con su pastilla" },
  { foto: "PC", nombre: "Patricia C.", rol: "Pitalito, Colombia", texto: "La verdad no he sido juiciosa, pero sí me siento mejor, menos cansancio…", tag: "Mensaje de WhatsApp" },
  { foto: "NQ", nombre: "Nidia Q.", rol: "Neiva, Colombia · nota de voz", texto: "Sí, muy muy bueno, pues estoy en la espera de que termine el tarrito, que todavía me faltan, para solicitar otro. La verdad sí voy a continuar con el tratamiento porque me ha servido bastante.", tag: "Va por su segundo pedido" },
  { foto: "AQ", nombre: "Ángela Q.", rol: "Itagüí, Colombia", texto: "¿Y puedo seguir tomando las de la tiroides así pida alguna de ellas, o cómo las debo alternar? Ya que me siento muy bien con MI TIROIDES.", tag: "Clienta que repite" },
  { foto: "RB", nombre: "Rosero B.", rol: "Ipiales, Colombia", texto: "Gracias, sigo con el tratamiento, me siento muy bien.", tag: "Sigue con el tratamiento" },
  { foto: "CA", nombre: "Carmen", rol: "Buenaventura, Colombia", texto: "Sí, claro que me ha servido mucho, lo necesito. Lo que pasa es que me he quedado sin empleo y no he tenido forma de adquirirlo. Tan pronto tenga hago el pedido.", tag: "Quiere volver a pedir" },
];

function Iniciales({ t, size = 44 }: { t: string; size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: "50%", background: "#1f3d2b", color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
        fontSize: size * 0.36, letterSpacing: 0.5, flexShrink: 0,
      }}
    >
      {t}
    </div>
  );
}

const ANGULOS: Record<"agua" | "pastilla" | "secreto" | "esponja", { h1: string; sub: string }> = {
  agua: {
    h1: "No engordó. Se inflamó. Es agua, no grasa.",
    sub: "Come igual que siempre y el cuerpo no baja. No es falta de disciplina: cuando la tiroides se pone lenta, el cuerpo retiene líquido y se inflama. MI TIROIDES le aporta los 6 nutrientes que su tiroides usa para trabajar, juntos en 2 cápsulas con el desayuno. Va con su pastilla, no la reemplaza.",
  },
  pastilla: {
    h1: "Su pastilla de la tiroides no trabaja sola.",
    sub: "Toma la levotiroxina todos los días, sin falta, y aun así vive hinchada, cansada y con el cuerpo pesado. Esa pastilla repone la hormona, pero no le da a su tiroides el selenio, yodo, zinc, L-tirosina, B12 y D3 que usa para funcionar. MI TIROIDES se los aporta juntos. Va con su pastilla, no la reemplaza.",
  },
  secreto: {
    h1: "El secreto que nadie le dijo sobre su barriga.",
    sub: "No es floja ni comió de más. Casi nadie le revisa la glándula que decide si su cuerpo guarda o suelta el líquido: la tiroides. Cuando se pone lenta, usted se hincha y se cansa. MI TIROIDES le aporta los 6 nutrientes que esa glándula usa para trabajar.",
  },
  esponja: {
    h1: "Su cuerpo guarda agua como una esponja mojada.",
    sub: "Cuando la tiroides está lenta, el cuerpo retiene líquido y usted amanece hinchada, pesada y con la mente nublada. MI TIROIDES le aporta los 6 nutrientes que su tiroides usa para trabajar, en 2 cápsulas con el desayuno. Va con su pastilla, no la reemplaza.",
  },
};

export default function Page() {
  useCapturarTrackingOnMount();
  const [cantidad, setCantidad] = useState<Cantidad>("2");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ id: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [ingActivo, setIngActivo] = useState<Ingrediente | null>(null);
  const [depto, setDepto] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [angulo, setAngulo] = useState<"agua" | "pastilla" | "secreto" | "esponja">("agua");
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("angle");
    if (a === "agua" || a === "pastilla" || a === "secreto" || a === "esponja") {
      setAngulo(a);
      setHeroIdx(0);
    }
  }, []);
  // El primer slide siempre es el hero del ángulo activo; detrás van los neutrales.
  const heroImages = [HERO_MUJER[angulo], ...HERO_RESTO];
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [ciudadInput, setCiudadInput] = useState("");
  const [ciudadFocus, setCiudadFocus] = useState(false);
  const abandonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed aleatoria — se inicia en el primer render del cliente (lazy init)
  // Lazy init garantiza que se ejecute UNA vez al montar y que el shuffle se aplique antes del paint
  const [seedBase] = useState<number>(() => {
    if (typeof window === "undefined") return 1; // SSR fallback
    return Math.floor(Math.random() * 100000) + 1;
  });

  // Avatar stack: shuffle base de testi cortos
  const avatarStackShuffled = useMemo(
    () => shuffleWithSeed(TESTI_CORTOS, seedBase + 7919),
    [seedBase],
  );

  // Testi cortos: shuffle pero forzando que la PRIMERA sea distinta a la primera del avatar stack
  const testiCortosShuffled = useMemo(() => {
    const shuffled = shuffleWithSeed(TESTI_CORTOS, seedBase + 1);
    const firstAvatar = avatarStackShuffled[0]?.foto;
    if (shuffled[0]?.foto === firstAvatar && shuffled.length > 1) {
      return [...shuffled.slice(1), shuffled[0]];
    }
    return shuffled;
  }, [seedBase, avatarStackShuffled]);

  // Testi largos: shuffle forzando que la PRIMERA sea distinta a las anteriores
  const testiLargosShuffled = useMemo(() => {
    const shuffled = shuffleWithSeed(TESTI_LARGOS, seedBase + 31337);
    const usadas = new Set([
      avatarStackShuffled[0]?.foto,
      testiCortosShuffled[0]?.foto,
    ]);
    if (usadas.has(shuffled[0]?.foto)) {
      const idxLibre = shuffled.findIndex((t) => !usadas.has(t.foto));
      if (idxLibre > 0) {
        const reordered = [...shuffled];
        const [item] = reordered.splice(idxLibre, 1);
        reordered.unshift(item);
        return reordered;
      }
    }
    return shuffled;
  }, [seedBase, avatarStackShuffled, testiCortosShuffled]);

  // === Fix #4: Restore desde localStorage al abrir el modal ===
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
        if (d.provincia) setDepto(d.provincia);
        if (d.ciudad) { setCiudad(d.ciudad); setCiudadInput(d.ciudad); }
      }
    } catch {}
  }, [modalOpen]);

  // === Fix #4: Autosave + ping al bot para recuperación ===
  useEffect(() => {
    if (!modalOpen) return;
    if (!nombre && !telefono && !direccion) return;
    const draft: FormDraft = {
      nombre, telefono, direccion, referencia,
      provincia: depto, ciudad, cantidad, ts: Date.now(),
    };
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft)); } catch {}

    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    if (esCelularECValido(telefono) && nombre.trim().length >= 2) {
      abandonTimer.current = setTimeout(() => {
        const tel = sanitizarTelefonoEC(telefono);
        try {
          // BUG FIX 2026-06-16: el beacon NO incluía el tracking (utm_source,
          // fbclid, ttclid, etc.) de sessionStorage. Por eso 135 preliminares
          // del mes quedaron como "Sin atribuir" en el pipeline aunque venían
          // de Meta/TikTok. Ahora se incluye explícitamente el tracking.
          const tracking = leerTracking();
          const blob = new Blob([JSON.stringify({
            tipo: "abandono_form",
            nombre: nombre.trim(),
            telefono: tel,
            provincia: depto || null,
            ciudad: ciudad || null,
            direccion: direccion || null,
            referencia: referencia || null,
            cantidad,
            total: PLANES[cantidad].precio,
            ts: new Date().toISOString(),
            ...tracking,  // utm_source, utm_campaign, utm_content, utm_medium, fbclid, ttclid, referrer
          })], { type: "application/json" });
          navigator.sendBeacon?.("/api/pedido-ec", blob);
        } catch {}
      }, 8000);
    }
    return () => {
      if (abandonTimer.current) clearTimeout(abandonTimer.current);
    };
  }, [modalOpen, nombre, telefono, direccion, referencia, depto, ciudad, cantidad]);

  const contentId = `mi-tiroides-ec-${cantidad}-frascos`;

  function openModal() {
    setOk(false);
    setError(null);
    setModalOpen(true);
    const value = PLANES[cantidad].precio;
    window.fbq?.("track", "InitiateCheckout", {
      value, currency: "USD", content_ids: [contentId], content_name: CONTENT_NAME,
      content_type: "product", num_items: PLANES[cantidad].frascos,
    });
    window.gtag?.("event", "begin_checkout", { value, currency: "USD" });
    window.ttq?.track("InitiateCheckout", {
      value, currency: "USD", content_id: contentId, content_type: "product",
      content_name: CONTENT_NAME, quantity: PLANES[cantidad].frascos,
    });
  }
  function closeModal() {
    setModalOpen(false);
  }

  function trackLead(value: number) {
    window.fbq?.("track", "Lead", { value, currency: "USD", content_ids: [contentId], content_name: CONTENT_NAME });
    window.gtag?.("event", "generate_lead", { value, currency: "USD" });
    window.ttq?.track("SubmitForm", { value, currency: "USD", content_id: contentId, content_name: CONTENT_NAME });
  }
  function trackPurchase(value: number, eventId: string) {
    window.fbq?.("track", "Purchase", {
      value, currency: "USD", content_ids: [contentId], content_name: CONTENT_NAME,
      content_type: "product", num_items: PLANES[cantidad].frascos,
    }, { eventID: eventId });
    window.gtag?.("event", "purchase", { value, currency: "USD", transaction_id: eventId });
    window.ttq?.track("CompletePayment", {
      value, currency: "USD", content_id: contentId, content_type: "product",
      content_name: CONTENT_NAME, quantity: PLANES[cantidad].frascos,
    }, { event_id: eventId });
  }

  // Validación en tiempo real (deshabilita el botón hasta que todo esté bien).
  // En Ecuador la ciudad es texto libre: la provincia sí debe ser una de las 24.
  const formValido =
    esCelularECValido(telefono) &&
    nombre.trim().length >= 3 &&
    direccion.trim().length >= 6 &&
    !!depto &&
    ciudad.trim().length >= 2 &&
    referencia.trim().length >= 4;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!esCelularECValido(telefono)) {
      setError("Necesitamos su celular de Ecuador (10 dígitos que empiezan en 09).");
      return;
    }
    if (!nombre.trim() || nombre.trim().length < 3) {
      setError("Escriba su nombre completo.");
      return;
    }
    if (!direccion.trim() || direccion.trim().length < 6) {
      setError("Escriba su dirección completa.");
      return;
    }
    if (!depto || ciudad.trim().length < 2) {
      setError("Elija su provincia y escriba su ciudad o cantón.");
      return;
    }
    if (!referencia.trim() || referencia.trim().length < 4) {
      setError("Escriba el barrio o sector y una referencia para que el repartidor la encuentre.");
      return;
    }

    setEnviando(true);

    const telSanitizado = sanitizarTelefonoEC(telefono);
    // anti-fraude: honeypot (leído del form) + time-to-submit (desde carga de página)
    const empresaHoneypot = ((e.currentTarget as HTMLFormElement)?.querySelector("input[name='empresa']") as HTMLInputElement | null)?.value || "";
    const formLoadedAt = typeof performance !== "undefined" && performance.timeOrigin ? Math.round(performance.timeOrigin) : Date.now();
    const tracking = leerTracking();
    const data = {
      nombre: nombre.trim(),
      telefono: telSanitizado,
      provincia: depto,
      ciudad: ciudad.trim(),
      referencia: referencia.trim(),
      direccion: direccion.trim(),
      cantidad,
      total: PLANES[cantidad as Cantidad].precio,
      empresa: empresaHoneypot,
      formLoadedAt,
      ...tracking,
    };
    const plan = PLANES[cantidad];
    const total = plan.precio;

    const fingerprint = `${data.telefono}-${cantidad}`;
    const lastKey = "mit_ec_last_purchase";
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

    let pedidoId = `EC-${Date.now().toString(36).toUpperCase()}`;
    let registroOk = false;

    try {
      const res = await fetch("/api/pedido-ec", {
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
          // El backend marca valido=true cuando la provincia es una de las 24
          backendValido = j?.valido === true;
        } catch {}
        registroOk = true;
        // Pixel Purchase SOLO si backend valida ciudad (evita mandar data sucia a Meta)
        if (!alreadyFired && backendValido) {
          trackPurchase(total, pedidoId);
          try { localStorage.setItem(lastKey, JSON.stringify({ fp: fingerprint, ts: Date.now() })); } catch {}
        }
      } else {
        try {
          const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
          navigator.sendBeacon?.("/api/pedido-ec", blob);
          registroOk = true;
        } catch {}
      }
    } catch {
      try {
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        navigator.sendBeacon?.("/api/pedido-ec", blob);
        registroOk = true;
      } catch {}
    }

    if (registroOk) {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
      setPedidoConfirmado({ id: pedidoId, total });
      setOk(true);
    } else {
      setError("No pudimos registrar su pedido. Intente de nuevo en un momento.");
    }
    setEnviando(false);
  }

  const plan = PLANES[cantidad];

  return (
    <>
      {/* MARQUEE */}
      <div className="marquee">
        <div className="marquee-track">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i}>✦ Envío gratis a todo Ecuador &nbsp;&nbsp; ✦ Pago contra entrega &nbsp;&nbsp;</span>
          ))}
        </div>
      </div>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">MI TIROIDES</div>
          <div className="nav-links">
            <a href="#ingredientes">Ingredientes</a>
            <a href="#testimonios">Testimonios</a>
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
              <Image
                src={heroImages[heroIdx].src}
                alt={heroImages[heroIdx].alt}
                width={896}
                height={1152}
                priority
                key={heroImages[heroIdx].src}
              />
            </div>
            <div className="hero-thumbs">
              {heroImages.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setHeroIdx(i)}
                  className={`hero-thumb ${i === heroIdx ? "active" : ""}`}
                  aria-label={img.alt}
                >
                  <Image src={img.src} alt={img.alt} width={120} height={120} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <h1 className="h1">{ANGULOS[angulo].h1}</h1>
            <div className="rating-row">
              <span className="stars">★★★★★</span>
              <span><strong>+6.600 pedidos entregados</strong> en Colombia · ahora en Ecuador</span>
            </div>
            <p className="v6b-sub" style={{ color: "var(--gris)", fontSize: 16, margin: "0 0 12px" }}>{ANGULOS[angulo].sub}</p>
            {/* V6B · OFERTA EN LA PRIMERA PANTALLA (3-oct-2026): escalera 1/2/3 visible,
                garantía 90 días desde la entrega, objeción de la pastilla al lado del botón. */}
            <div className="v6b-oferta" role="radiogroup" aria-label="Elija su tratamiento">
              {(Object.keys(PLANES) as Cantidad[]).map((k) => {
                const p = PLANES[k];
                const sel = cantidad === k;
                const porFrasco = p.precio / p.frascos;
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
                    <span className="v6b-op-precio">{usd(p.precio)}</span>
                    <span className="v6b-op-sub">
                      {k === "1" ? "precio por frasco" : k === "2" ? `el 2.º frasco a ${usd(PLANES["2"].precio - PLANES["1"].precio)}` : `${usd(porFrasco)} por frasco`}
                    </span>
                  </button>
                );
              })}
            </div>

            <button className="btn btn-block v6b-cta" onClick={openModal}>
              Pedir ahora · paga al recibir
              <span>{PLANES[cantidad].label} · {usd(PLANES[cantidad].precio)} · envío gratis</span>
            </button>
            <div className="hero-checks">
              <div>No paga nada hoy: paga en efectivo cuando lo recibe</div>
              <div>Envío gratis a todo Ecuador · le confirmamos la entrega por teléfono</div>
              {GARANTIA_EC && <div><strong>Garantía de 90 días</strong> desde el día que lo recibe</div>}
              <div>Va con su pastilla, no la reemplaza</div>
            </div>
            <div className="badges">
              <span className="badge">Vegano</span>
              <span className="badge">Sin gluten</span>
              <span className="badge">Notificación Sanitaria ARCSA</span>
              <span className="badge">6 nutrientes</span>
              {ASISTENTE_EC && (
                <span className="badge" style={{ background: "#1f3d2b", color: "#fff", borderColor: "#1f3d2b" }}>
                  🌿 Asistente incluido
                </span>
              )}
            </div>
            <div className="badges" style={{ marginBottom: 12 }} role="group" aria-label="¿Qué la trajo aquí?">
              {(["agua", "pastilla", "secreto", "esponja"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setAngulo(k); setHeroIdx(0); }}
                  className="badge"
                  style={{ cursor: "pointer", ...(angulo === k ? { background: "#1f3d2b", color: "#fff", borderColor: "#1f3d2b" } : {}) }}
                >
                  {k === "agua" ? "Es agua, no grasa" : k === "pastilla" ? "Tomo mi pastilla y sigo igual" : k === "secreto" ? "Mi barriga no baja" : "Vivo hinchada"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MINI TESTIMONIOS */}
      <section className="section-tight section-beige">
        <div className="container">
          <div className="eyebrow">Lo que escriben nuestras clientas en Colombia</div>
          <div className="review-strip">
            <div className="avatar-stack">
              {avatarStackShuffled.slice(0, 4).map((t) => (
                <div key={t.foto} className="avatar">
                  <Iniciales t={t.foto} size={40} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "var(--gris)" }}>
              <strong style={{ color: "var(--tinta)" }}>+6.600 pedidos entregados</strong>
              <div>en Colombia · Pago contra entrega{GARANTIA_EC ? " · Garantía 90 días" : ""}</div>
            </div>
          </div>

          <div className="testi-scroller">
            <div className="testi-track">
              {testiCortosShuffled.map((t) => (
                <div key={t.foto} className="testi-card">
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <Iniciales t={t.foto} />
                    <div className="stars">★★★★★</div>
                  </div>
                  <p>“{t.texto}”</p>
                  <footer>
                    <div>
                      <strong>{t.nombre}</strong>
                      <span>{t.ciudad}, Colombia · mensaje real por WhatsApp</span>
                    </div>
                  </footer>
                </div>
              ))}
            </div>
            <div className="testi-hint">← Desliza para ver más →</div>
          </div>
        </div>
      </section>

      {/* DOLOR / TE SUENA FAMILIAR */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">¿Le suena familiar?</div>
          <h2 className="h2">Come bien, se toma su pastilla todos los días, camina…<br />y aun así vive hinchada y con el cuerpo pesado</h2>
          <div className="dolor-grid">
            {[
              ["💧", "Se hincha y retiene líquido", "Amanece con la cara y los párpados hinchados, y en la tarde las piernas se le inflan."],
              ["⚖️", "El cuerpo no baja", "Come igual que siempre pero el peso no se mueve o sube sin explicación. No es grasa, es agua."],
              ["🤰", "Barriga inflada", "El estómago siempre inflado y la ropa que le apretaba cada vez más, aunque no coma de más."],
              ["🥱", "Cansancio constante", "Se despierta agotada y al mediodía ya no puede más, aunque durmió bien."],
              ["🧠", "Mente nublada", "Olvida cosas, le cuesta concentrarse y siente que la cabeza le va lenta."],
              ["🥶", "Frío constante", "Manos y pies fríos aunque haga buen clima — las demás tienen calor."],
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
          <p style={{ textAlign: "center", maxWidth: 640, margin: "10px auto 0", fontSize: 16 }}>
            Si se identifica con al menos 2 de estos puntos,{" "}
            <strong>no es floja ni falta de disciplina — es su tiroides reteniendo líquido, aunque su examen diga “normal”.</strong>
          </p>
          <p style={{ textAlign: "center", color: "var(--gris)", maxWidth: 640, margin: "8px auto 0", fontSize: 15 }}>
            Su pastilla reemplaza la hormona, pero no le da a su tiroides los nutrientes que necesita
            para trabajar. Por eso sigue igual aunque su examen salga “normal” y le digan que todo está bien.
          </p>
        </div>
      </section>

      {/* ESTRÉS → TIROIDES — gancho científico */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">La causa que casi nadie le explica</div>
          <h2 className="h2">Con pastilla y todo, sigue hinchada — y esta es la razón</h2>
          <p className="lead">
            Los años, el estrés y las hormonas van dejando la tiroides lenta. Cuando eso pasa, el cuerpo
            <strong> retiene líquido y frena la conversión de T4 en T3</strong> (la hormona que de verdad
            usa), y se le quema a la tiroides el selenio, el zinc y el yodo que necesita. Su pastilla le
            repone la hormona… pero no esos nutrientes. Por eso vive hinchada y cansada, aunque su TSH
            salga “normal”.
          </p>

          <div className="estres-grid">
            <div className="estres-card">
              <div className="estres-num">1</div>
              <strong>Tiroides lenta</strong>
              <p>Los años, el estrés y las hormonas la van frenando. El cuerpo entra en modo ahorro y no sale.</p>
            </div>
            <div className="estres-arrow">→</div>
            <div className="estres-card">
              <div className="estres-num">2</div>
              <strong>Cortisol elevado</strong>
              <p>El estrés sostenido aumenta el gasto de selenio, zinc y B12 — justo los que su tiroides usa.</p>
            </div>
            <div className="estres-arrow">→</div>
            <div className="estres-card">
              <div className="estres-num">3</div>
              <strong>Retiene líquido</strong>
              <p>Con la tiroides lenta, el cuerpo guarda agua, se inflama y vive cansada… aunque su TSH salga “normal”.</p>
            </div>
          </div>

          <div className="estres-cierre">
            <div className="estres-cierre-titulo">¿Cómo la ayuda MI TIROIDES?</div>
            <ul className="estres-lista">
              <li><strong>Selenio + Zinc:</strong> le aportan lo que el estrés le gasta cada día.</li>
              <li><strong>L-Tirosina:</strong> la materia prima de la hormona tiroidea — esencial bajo estrés.</li>
              <li><strong>B12 + D3:</strong> participan en el metabolismo energético y en el sistema inmune.</li>
              <li><strong>Yodo:</strong> en dosis diaria segura, el que su tiroides usa para formar sus hormonas.</li>
            </ul>
            <p className="estres-disclaimer">
              MI TIROIDES no es magia ni un diurético. Es el combustible que a su tiroides le falta para
              trabajar — el que su pastilla no trae. Va con su pastilla, no la reemplaza. Dele 60-90 días
              con sueño y movimiento, y nótelo usted misma.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARATIVA - tabla horizontal */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">Ya intentó lo demás</div>
          <h2 className="h2">Ya probó de todo. Esto es distinto.</h2>
          <p className="lead">Hizo dietas, caminó, probó el multivitamínico de la farmacia, hasta subió la dosis. Mire en qué es distinto MI TIROIDES.</p>

          {/* Hint mobile: desliza para ver más */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--gris)",
              marginBottom: 10,
              fontStyle: "italic",
            }}
            className="ctable-hint-mobile"
          >
            <span style={{ animation: "swipeHint 1.6s ease-in-out infinite" }}>👉</span>
            <span>Desliza la tabla para verla completa</span>
          </div>
          <style>{`
            @keyframes swipeHint {
              0%, 100% { transform: translateX(0); }
              50% { transform: translateX(8px); }
            }
            @media (min-width: 760px) {
              .ctable-hint-mobile { display: none !important; }
            }
            .ctable-hinted { position: relative; }
            .ctable-hinted::after {
              content: "";
              position: absolute;
              top: 0;
              right: 0;
              width: 40px;
              height: 100%;
              background: linear-gradient(to right, transparent, rgba(0,0,0,0.08));
              pointer-events: none;
              border-radius: 0 12px 12px 0;
            }
            @media (min-width: 760px) {
              .ctable-hinted::after { display: none; }
            }
          `}</style>

          <div className="ctable ctable-hinted">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className="ctable-feat">
                    <Image src="/img/bundle-1.webp" alt="MI TIROIDES" width={80} height={80} />
                    <span>MI TIROIDES</span>
                    <small>{usd(PLANES["1"].precio)} / 45 días</small>
                    <em className="ctable-tag">RECOMENDADO</em>
                  </th>
                  <th>
                    <div className="ctable-icon">💊</div>
                    <span>Levotiroxina sola</span>
                    <small>Solo medicamento</small>
                  </th>
                  <th>
                    <div className="ctable-icon">📦</div>
                    <span>Importados por internet</span>
                    <small>Tarjeta + envío internacional</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Fórmula específica tiroides", "yes", "no", "mid"],
                  ["Aporta los nutrientes que usa la tiroides", "yes", "no", "mid"],
                  ["Selenio + Zinc + D3 incluidos", "yes", "no", "yes"],
                  ["Selenio + zinc para la conversión T4 → T3", "yes", "no", "yes"],
                  ["Una sola cápsula al día", "yes", "yes", "no"],
                  ["Notificación Sanitaria ARCSA", "yes", "yes", "no"],
                  ["Sin tarjeta ni aduana", "yes", "yes", "no"],
                  ["Pago contra entrega", "yes", "no", "no"],
                  ...(GARANTIA_EC ? [["Garantía 90 días desde la entrega", "yes", "no", "no"]] : []),
                ].map(([feat, a, b, c]) => (
                  <tr key={feat as string}>
                    <td>{feat}</td>
                    <td className="ctable-feat-cell"><Mark v={a as string} /></td>
                    <td><Mark v={b as string} /></td>
                    <td><Mark v={c as string} /></td>
                  </tr>
                ))}
                <tr className="ctable-cta-row">
                  <td></td>
                  <td>
                    <button className="btn" onClick={openModal} style={{ padding: "10px 16px", fontSize: 13 }}>
                      Pedir ahora
                    </button>
                  </td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ textAlign: "center", color: "var(--gris)", marginTop: 18, fontSize: 13 }}>
            * MI TIROIDES no reemplaza su medicamento: es un suplemento alimenticio que aporta nutrientes.
          </p>

          {/* Mini-gancho post-tabla: pivotea de comparación a urgencia */}
          <div
            style={{
              maxWidth: 620,
              margin: "20px auto 0",
              textAlign: "center",
              padding: "16px 20px",
              background: "rgba(31, 61, 43, .06)",
              borderRadius: 10,
              fontSize: 15,
              lineHeight: 1.6,
              color: "#1f3d2b",
            }}
          >
            En 60 días va a estar frente al mismo espejo, con el mismo cepillo
            lleno de pelo… o no. <strong>La diferencia empieza con lo que decida hoy.</strong>
          </div>
        </div>
      </section>

      {/* FÓRMULA */}
      <section className="section section-verde" id="ingredientes">
        <div className="container">
          <div className="eyebrow">La fórmula</div>
          <h2 className="h2">6 nutrientes. 0 rellenos.</h2>
          <p className="lead">Cada cápsula trae lo que su tiroides usa, en dosis con respaldo científico.</p>

          <div className="ing-grid">
            {INGREDIENTES.map((ing) => (
              <button
                type="button"
                key={ing.n}
                className="ing-card"
                onClick={() => setIngActivo(ing)}
              >
                <div className="ing-foto">
                  <Image src={ing.foto} alt={ing.n} width={400} height={400} />
                </div>
                <h3>{ing.n}</h3>
                <div className="dose">{ing.d}</div>
                <p>{ing.resumen}</p>
                <span className="ing-vermas">Ver más →</span>
              </button>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "#d6cdb3", marginTop: 32, fontSize: 14 }}>
            Cápsula vegetal HPMC · Sin azúcar · Sin colorantes · Sin GMO · Vegano
          </p>
        </div>
      </section>

      {/* RITUAL / BENEFICIOS */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Conozca MI TIROIDES</div>
          <h2 className="h2">Su ritual diario, con los nutrientes que su tiroides usa</h2>
          <p className="lead">2 cápsulas al día. 10 segundos. Sin sabor, sin preparación.</p>

          <div className="beneficio-grid">
            {[
              {
                tag: "Semanas 1-4",
                t: "Energía",
                d: "La B12 participa en el metabolismo energético normal. Lo importante en el primer mes: 2 cápsulas con el desayuno, sin fallar.",
              },
              {
                tag: "Mes 2",
                t: "Hinchazón",
                d: "El selenio y el zinc participan en la conversión de T4 (la hormona de su pastilla) en T3, la forma que su cuerpo usa.",
              },
              {
                tag: "Meses 2-3",
                t: "Metabolismo",
                d: "La L-tirosina y el yodo son la materia prima de sus hormonas tiroideas, las que marcan el ritmo de su metabolismo.",
              },
              {
                tag: "Uso continuo",
                t: "Ánimo",
                d: "La B12 y la D3 participan en el sistema nervioso y en el sistema inmune. Es un tratamiento: se nota con constancia.",
              },
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

      {/* CIFRAS REALES · reemplaza el "respaldo médico" y la encuesta inventados (3-oct-2026).
          Fuente: CRM (pedidos cobrados mi_tiroides+shopify desde 8-may-2026). Actualizar cada mes. */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Cifras reales, no encuestas</div>
          <h2 className="h2">Lo que dicen nuestros despachos</h2>
          <div className="stats-grid">
            {[
              ["+6.600", "pedidos entregados y pagados contra entrega en Colombia desde mayo de 2026"],
              ["511", "municipios de Colombia a los que ya hemos llegado"],
              ["+12.400", "frascos entregados en manos de clientas en Colombia"],
              ["+700", "clientas que ya volvieron a pedir su siguiente tratamiento"],
            ].map(([n, t]) => (
              <div key={n} className="stat-card">
                <div className="stat-num">{n}</div>
                <p>{t}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "var(--gris)", marginTop: 22, fontSize: 12 }}>
            Datos de nuestro sistema de pedidos en Colombia al 3 de octubre de 2026. Ahora llegamos a Ecuador.
          </p>
        </div>
      </section>

      {/* TRATAMIENTO 3 MESES */}
      <section className="section section-verde">
        <div className="container-sm" style={{ textAlign: "center" }}>
          <div className="eyebrow">Importante</div>
          <h2 className="h2">Esto es un tratamiento, no una pastilla milagrosa</h2>
          <p className="lead" style={{ color: "#d6cdb3" }}>
            Los nutrientes funcionan por acumulación: su cuerpo los recibe, los guarda y los usa día a día.
            Por eso recomendamos un <strong style={{ color: "#fff" }}>mínimo de 3 meses continuos</strong> para notar
            cómo se siente usted.
          </p>
          <p style={{ color: "#d6cdb3", marginTop: 12 }}>
            Un frasco dura 45 días.
            <br />
            <strong style={{ color: "#fff" }}>El tratamiento completo son 2 frascos: 90 días.</strong>
          </p>
        </div>
      </section>

      {/* TESTIMONIOS LARGOS */}
      <section className="section section-beige" id="testimonios">
        <div className="container">
          <div className="eyebrow">Mensajes reales · clientas en Colombia</div>
          <h2 className="h2">Lo que nos escriben por WhatsApp</h2>
          <p className="lead">Copiados tal cual de los chats de clientas de MI TIROIDES en Colombia. Solo dejamos la inicial del apellido y la ciudad.</p>

          <div className="testi-scroller">
            <div className="testi-track">
              {testiLargosShuffled.map((t) => (
                <div key={t.foto} className="testi-card">
                  <footer style={{ borderBottom: "1px solid #e6dfcc", paddingBottom: 12, marginTop: 0, display: "flex", gap: 10, alignItems: "center" }}>
                    <Iniciales t={t.foto} />
                    <div>
                      <strong>{t.nombre}</strong>
                      <span>{t.rol}</span>
                    </div>
                  </footer>
                  <p>“{t.texto}”</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span className="stars">★★★★★</span>
                    <span style={{ fontSize: 11, color: "var(--verde-2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
                      {t.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="testi-hint">← Desliza para ver más →</div>
          </div>
        </div>
      </section>

      {/* MI TIROIDES EN TU VIDA — ritual diario con timeline */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Cómo se toma · Su rutina de 90 días</div>
          <h2 className="h2">Un ritual simple, 90 días de constancia</h2>
          <p className="lead">
            <strong>2 cápsulas, 1 vez al día, con el desayuno.</strong> Eso es todo. Aquí le mostramos cuándo
            tomarlo y cómo se ve el tratamiento, semana a semana.
          </p>

          <div className="sincara-scroller">
            <div className="sincara-track">
              {SIN_CARA.map((s) => (
                <div key={s.src} className="sincara-card">
                  <div className="sincara-foto">
                    <Image src={s.src} alt={s.titulo} width={500} height={620} />
                    <span className="sincara-momento">{s.momento}</span>
                  </div>
                  <div className="sincara-titulo">{s.titulo}</div>
                  <div className="sincara-caption">{s.caption}</div>
                </div>
              ))}
            </div>
            <div className="testi-hint">← Desliza para ver el recorrido completo →</div>
          </div>

          <div className="ritual-cierre">
            <strong>¿Y si me olvido un día?</strong> No pasa nada — la suplementación funciona por
            acumulación, no por una sola dosis. Solo retome al día siguiente con su desayuno.
          </div>
        </div>
      </section>

      {/* ancla invisible para <a href="#comprar"> en la nav */}
      <span id="comprar" />

      {/* ASISTENTE INCLUIDO (apagado en Ecuador hasta tener WhatsApp +593: ASISTENTE_EC) */}
      {ASISTENTE_EC && (
      <section className="section section-beige" id="asistente">
        <div className="container-sm">
          <div className="eyebrow" style={{ color: "#c9a14a" }}>Incluido sin costo</div>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            No está sola en su tratamiento.
          </h2>
          <p style={{ color: "var(--gris)", fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
            Con cada pedido recibe acceso GRATIS a su <strong>asistente personal de bienestar</strong> por WhatsApp, que la acompaña durante todo el tratamiento.
          </p>

          <div
            style={{
              display: "grid",
              gap: 14,
              maxWidth: 520,
              margin: "0 auto 28px",
            }}
          >
            {[
              { i: "🥗", t: "Alimentos ideales para su tiroides", d: "Cada semana le enviamos qué incluir y qué evitar según su etapa del tratamiento." },
              { i: "🌱", t: "Hábitos clave cada semana", d: "Pequeños cambios graduales (sueño, estrés, movimiento) que potencian el efecto del suplemento." },
              { i: "📊", t: "Seguimiento de su progreso", d: "Le escribimos cada 7-14 días para saber cómo se siente y ajustar la guía." },
              { i: "💬", t: "Resuelve dudas cuando quieras", d: "¿Puedo tomarlo con café? ¿Y si tomo levotiroxina? Te respondemos al momento." },
            ].map((it) => (
              <div
                key={it.t}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  background: "#fff",
                  border: "1px solid #ebe2cc",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div style={{ fontSize: 26, lineHeight: 1, marginTop: 2 }}>{it.i}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1f3d2b", marginBottom: 2 }}>
                    {it.t}
                  </div>
                  <div style={{ fontSize: 13, color: "#5a5a5a", lineHeight: 1.5 }}>{it.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px dashed #c9a14a",
              borderRadius: 12,
              padding: "16px 18px",
              maxWidth: 520,
              margin: "0 auto",
              fontSize: 13,
              color: "#5a5a5a",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "#1f3d2b" }}>Importante:</strong> el asistente no reemplaza al médico — es un acompañamiento de hábitos y nutrición. Para temas clínicos siempre le recomendamos consultar a su especialista.
          </div>
        </div>
      </section>
      )}

      {/* FAQ */}
      <section className="section section-beige" id="faq">
        <div className="container-sm">
          <div className="eyebrow">Preguntas frecuentes</div>
          <h2 className="h2">Resolvemos sus dudas</h2>

          <div className="faq">
            <details>
              <summary>¿Es otro de esos suplementos de TikTok?</summary>
              <p>
                No. MI TIROIDES tiene <strong>Notificación Sanitaria ARCSA</strong>, se fabrica bajo Buenas
                Prácticas y se paga <strong>contra entrega</strong>.
                {GARANTIA_EC && (
                  <> Si en <strong>90 días desde que lo recibe</strong> no nota el cambio, le devolvemos el dinero.
                  Sin devolver el frasco, sin preguntas.</>
                )}
              </p>
            </details>
            <details>
              <summary>¿Qué lo diferencia de un multivitamínico?</summary>
              <p>
                Un multivitamínico reparte un poco de todo. Este trae <strong>dosis específicas para la
                tiroides</strong> —selenio 200 mcg, yodo, zinc y L-tirosina—: el selenio y el zinc
                <strong> participan en la conversión a T3</strong>, la hormona que su cuerpo usa.
              </p>
            </details>
            <details>
              <summary>¿Lo puedo tomar con mi Eutirox / levotiroxina?</summary>
              <p>
                Sí. <strong>Va con su pastilla, no la reemplaza.</strong> Tome su pastilla en ayunas y MI TIROIDES con el
                desayuno, para que no se interfieran. Muchas de nuestras clientas están en levotiroxina +
                MI TIROIDES. Ante cualquier duda, consulte a su médico.
              </p>
            </details>
            <details>
              <summary>En la farmacia hay suplementos más baratos, ¿por qué este?</summary>
              <p>
                Porque no es lo mismo. Aquí paga por una <strong>fórmula específica para la tiroides</strong>
                (selenio, zinc, yodo y L-tirosina juntos, con B12 y D3) en una sola toma
                {GARANTIA_EC ? <>, con <strong>garantía de 90 días</strong></> : null}. Un genérico barato rara vez
                trae eso.
              </p>
            </details>
            <details>
              <summary>¿En cuánto tiempo lo noto?</summary>
              <p>
                Es un suplemento alimenticio, no un medicamento: los nutrientes funcionan por acumulación
                y cada organismo es distinto. Por eso lo presentamos como un tratamiento de 3 meses
                (2 frascos) y le pedimos constancia: 2 cápsulas con el desayuno, todos los días.
              </p>
            </details>
            <details>
              <summary>¿Sirve si mi problema es más estrés que tiroides?</summary>
              <p>
                El estrés sostenido aumenta el gasto de selenio, zinc y B12, los mismos nutrientes que su
                tiroides usa. MI TIROIDES se los aporta. No es un ansiolítico ni un medicamento: combínelo
                con buen sueño y pausas durante el día.
              </p>
            </details>
            <details>
              <summary>¿Tiene efectos secundarios?</summary>
              <p>
                La fórmula usa dosis fisiológicas seguras. Si tiene una condición renal, hepática o
                está embarazada, consulte con su médico antes de comenzar. No mezcla con
                ashwagandha (no incluida por precaución regulatoria).
              </p>
            </details>
            <details>
              <summary>¿Es una suscripción?</summary>
              <p>
                No. Es una compra única. Usted decide cuándo volver a pedir. Sin cargos automáticos.
                Paga contra entrega cuando el producto llega a su puerta.
              </p>
            </details>
            <details>
              <summary>¿Tiene registro sanitario?</summary>
              <p>
                Sí. MI TIROIDES Avanzado es un suplemento alimenticio con Notificación Sanitaria ARCSA
                N.° [PENDIENTE] y se fabrica bajo Buenas Prácticas de Manufactura. No es un medicamento.
              </p>
            </details>
            <details>
              <summary>¿Cómo se toma?</summary>
              <p>
                2 cápsulas al día con el desayuno. Cada frasco trae 90 cápsulas — alcanza para 45 días.
                Lo recomendado: 2 frascos = 90 días = el tratamiento completo de 3 meses.
              </p>
            </details>
            <details>
              <summary>¿Sirve para hombres?</summary>
              <p>
                Sí. La disfunción tiroidea afecta más a mujeres, pero los hombres con hipotiroidismo
                también se benefician — los nutrientes son los mismos.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* GANCHO URGENCIA — el costo del no actuar */}
      <section className="section section-beige">
        <div className="container-sm">
          <div
            style={{
              background: "#fff",
              border: "2px solid #b85a1e",
              borderRadius: 14,
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#b85a1e",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              UN MOMENTO ANTES DE SEGUIR
            </div>
            <h2 className="h2" style={{ marginBottom: 14, fontSize: 26 }}>
              ¿Cuánto vale otra semana sintiéndose hinchada y agotada?
            </h2>
            <p style={{ color: "var(--tinta)", fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              Lleva meses preguntándose si esto va a pasar solo. Pero la
              tiroides no se regula sola cuando está lenta y faltan
              nutrientes específicos. <strong>Cada día que pospone es otro día
              sintiéndose igual</strong>, otro día amaneciendo hinchada, otro
              día con el cuerpo pesado que no la deja moverse.
              <br /><br />
              <strong style={{ color: "#1f3d2b" }}>
                {usd(PLANES["1"].precio)} hoy &nbsp;vs&nbsp; otro mes igual a este.
              </strong>{" "}
              Esa es la decisión real.
            </p>
          </div>
        </div>
      </section>

      {/* CIERRE */}
      <section className="section section-verde">
        <div className="container-sm" style={{ textAlign: "center" }}>
          <h2 className="h2">¿Lista para empezar su tratamiento?</h2>
          <p style={{ color: "#d6cdb3", marginBottom: 26 }}>
            Más de 6.600 pedidos entregados en Colombia. Ahora llega a todo Ecuador y usted paga cuando lo recibe.
          </p>
          <button className="btn btn-light" onClick={openModal}>
            Sí, quiero empezar mi cambio HOY →
          </button>
          <p style={{ color: "#d6cdb3", marginTop: 16, fontSize: 14, fontStyle: "italic" }}>
            Pago contra entrega · Envío gratis a todo Ecuador{GARANTIA_EC ? " · Garantía de 90 días desde la entrega" : ""}
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          MI TIROIDES Avanzado · Suplemento alimenticio · Notificación Sanitaria ARCSA N.° [PENDIENTE] · No es un medicamento
          <br />
          Va con su pastilla, no la reemplaza. Este producto no reemplaza el tratamiento médico. Consulte a su profesional de salud.
        </div>
      </footer>

      {/* CTA flotante en mobile */}
      <button className="cta-float" onClick={openModal}>
        Pedir ahora · Pago contra entrega
      </button>

      {/* MODAL INGREDIENTE */}
      {ingActivo && (
        <div className="modal-overlay" onClick={() => setIngActivo(null)} role="dialog" aria-modal="true">
          <div className="modal modal-ing" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIngActivo(null)} aria-label="Cerrar">×</button>
            <div className="modal-ing-foto">
              <Image src={ingActivo.foto} alt={ingActivo.n} width={800} height={500} />
            </div>
            <div className="modal-ing-body">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <h3 style={{ margin: 0, color: "var(--verde)", fontSize: 26 }}>{ingActivo.n}</h3>
                <span style={{ color: "var(--dorado)", fontWeight: 800 }}>{ingActivo.d}</span>
              </div>
              <p style={{ color: "var(--gris)", margin: "0 0 16px", fontSize: 15 }}>
                <strong style={{ color: "var(--tinta)" }}>{ingActivo.resumen}</strong>
              </p>
              <h4 style={{ margin: "16px 0 6px", color: "var(--verde)" }}>¿Por qué lo usa su tiroides?</h4>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{ingActivo.porQue}</p>
              <h4 style={{ margin: "18px 0 6px", color: "var(--verde)" }}>Evidencia</h4>
              <ul style={{ paddingLeft: 18, margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--gris)" }}>
                {ingActivo.evidencia.map((e) => (
                  <li key={e} style={{ marginBottom: 4 }}>{e}</li>
                ))}
              </ul>
              <p style={{ marginTop: 18, fontSize: 13, color: "var(--gris)", fontStyle: "italic" }}>
                {ingActivo.fuentes}
              </p>
              <button className="btn btn-block" style={{ marginTop: 18 }} onClick={() => { setIngActivo(null); openModal(); }}>
                Pedir mi tratamiento →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* V6B · BARRA PEGAJOSA (solo móvil, ver globals.css) */}
      {!modalOpen && (
        <div className="v6b-sticky">
          <div className="v6b-sticky-info">
            <strong>{PLANES[cantidad].label} · {usd(PLANES[cantidad].precio)}</strong>
            Paga al recibir{GARANTIA_EC ? " · Garantía 90 días" : ""}
          </div>
          <button className="btn" onClick={openModal}>Pedir ahora</button>
        </div>
      )}
      <div className="v6b-spacer" />

      {/* MODAL DE COMPRA */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Cerrar">×</button>

            <div className="modal-head">
              <div className="modal-logo">
                <strong>MI TIROIDES</strong>
                <span>Avanzado · Suplemento alimenticio</span>
              </div>
              <div className="modal-pill">+6.600 pedidos entregados</div>
              <div className="modal-trustline">
                <span>💵 Paga al recibir</span>
                {GARANTIA_EC && <span>🛡️ Garantía 90 días</span>}
                <span>🇪🇨 Envío a todo Ecuador</span>
              </div>
              {/* Gancho urgencia dentro del modal — el momento más crítico */}
              {GARANTIA_EC && (
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
                Si no nota el cambio, le devolvemos el dinero. Y va con su pastilla, no la reemplaza.
              </div>
              )}
            </div>

            {ok && pedidoConfirmado ? (
              <div className="modal-success" style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 6 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#1f3d2b" }}>
                  ¡Pedido recibido!
                </h3>
                <p style={{ color: "var(--gris)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Le llamamos o le escribimos en las próximas horas para confirmar la dirección y la fecha de entrega.
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
                    {usd(pedidoConfirmado.total)}
                  </div>
                </div>
                <button className="btn btn-ghost btn-block" onClick={closeModal}>
                  Listo, cerrar
                </button>
              </div>
            ) : (
              <>
                {/* PLANES — cards horizontales */}
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
                          <div className={`modal-plan-tag ${p.tag.gold ? "gold" : ""}`}>
                            {p.tag.texto}
                          </div>
                        )}
                        <div className="modal-plan-img">
                          <Image
                            src={p.frascos === 1 ? "/img/ec-bundle-1.webp" : `/img/bundle-${p.frascos}.webp`}
                            alt={p.label}
                            width={300}
                            height={300}
                          />
                        </div>
                        <div className="modal-plan-title">
                          {p.label} <small>({p.frascos === 1 ? "45" : p.frascos === 2 ? "90" : "135"} días)</small>
                        </div>
                        {p.original > p.precio && (
                          <div className="modal-plan-tach">{usd(p.original)}</div>
                        )}
                        <div className="modal-plan-precio">{usd(p.precio)}</div>
                        <div className="modal-plan-perdia">{usd(p.perDia)} al día</div>
                      </button>
                    );
                  })}
                </div>

                {/* MÉTODO DE ENVÍO */}
                <div className="modal-section-title">Método de envío</div>
                <div className="modal-shipping">
                  <span className="modal-radio active" />
                  <strong>Envío gratis</strong>
                  <span style={{ marginLeft: "auto", color: "var(--gris)" }}>Gratis</span>
                </div>

                {/* DATOS */}
                <div className="modal-section-title green">Ingrese su dirección de envío</div>
                <form className="modal-form" onSubmit={onSubmit} noValidate>
                  {/* honeypot anti-bot — oculto a humanos; los bots lo llenan y quedan marcados */}
                  <input type="text" name="empresa" defaultValue="" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
                  <label>
                    <span className="modal-label">Celular <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>📞</span>
                      <input
                        name="telefono"
                        required
                        placeholder="099 123 4567"
                        inputMode="tel"
                        autoComplete="tel-national"
                        value={telefono}
                        onChange={(e) => setTelefono(formatearTelefonoEC(e.target.value))}
                      />
                    </div>
                    <small>A este número le confirmamos su pedido y la entrega</small>
                  </label>

                  <label>
                    <span className="modal-label">Nombre completo <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>👤</span>
                      <input
                        name="nombre"
                        required
                        placeholder="María Zambrano"
                        autoComplete="name"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                      />
                    </div>
                  </label>

                  <label>
                    <span className="modal-label">Dirección completa <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>📍</span>
                      <input
                        name="direccion"
                        required
                        placeholder="Av. 9 de Octubre y Boyacá, edificio Torres, piso 3"
                        autoComplete="street-address"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                      />
                    </div>
                  </label>

                  <label>
                    <span className="modal-label">Provincia <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🇪🇨</span>
                      <select
                        required
                        value={depto}
                        onChange={(e) => {
                          setDepto(e.target.value);
                          setCiudad("");
                          setCiudadInput("");
                        }}
                      >
                        <option value="">Elija su provincia</option>
                        {NOMBRES_PROVINCIAS_EC.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label style={{ position: "relative" }}>
                    <span className="modal-label">Ciudad o cantón <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🏙️</span>
                      <input
                        type="text"
                        required
                        placeholder={depto ? "Escriba su ciudad o cantón…" : "Primero elija su provincia"}
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
                      const opciones = PROVINCIAS_EC[depto] || [];
                      const q = ciudadInput.trim().toLowerCase();
                      const filtradas = q
                        ? opciones.filter((c) => c.toLowerCase().includes(q))
                        : opciones;
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
                    <span className="modal-label">Barrio o sector y referencia <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🧭</span>
                      <input
                        name="referencia"
                        required
                        placeholder="Ej: Urdesa Central, frente al parque"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                      />
                    </div>
                  </label>

                  {/* BLOQUE ASISTENTE INCLUIDO (apagado en Ecuador: ASISTENTE_EC) */}
                  {ASISTENTE_EC && (
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
                          La acompaña durante todo su tratamiento por WhatsApp:
                        </div>
                        <ul
                          style={{
                            margin: "6px 0 0",
                            paddingLeft: 18,
                            fontSize: 12,
                            color: "#1f3d2b",
                            lineHeight: 1.6,
                          }}
                        >
                          <li>Alimentos ideales para su tiroides</li>
                          <li>Hábitos clave cada semana</li>
                          <li>Seguimiento de su progreso</li>
                          <li>Resuelve dudas cuando quieras</li>
                          <li>
                            <strong>Precios especiales</strong> al renovar su tratamiento
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* RESUMEN */}
                  <div className="modal-summary">
                    <div className="modal-summary-row">
                      <span>Subtotal</span>
                      <span>{usd(plan.precio)}</span>
                    </div>
                    <div className="modal-summary-row">
                      <span>Envío</span>
                      <span>Gratis</span>
                    </div>
                    <div className="modal-summary-divider" />
                    <div className="modal-summary-row total">
                      <span>Total</span>
                      <strong>{usd(plan.precio)}</strong>
                    </div>
                  </div>

                  {/* Fix #7 — frase tranquila encima del botón */}
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
                          {usd(plan.precio)} · Envío gratis{GARANTIA_EC ? " · Garantía 90 días" : ""}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Fix #8 — trust badges debajo del botón */}
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
                    <div>
                      <div style={{ fontSize: 20 }}>💵</div>
                      Pago contra entrega
                    </div>
                    <div>
                      <div style={{ fontSize: 20 }}>🚚</div>
                      Envío gratis
                    </div>
                    <div>
                      <div style={{ fontSize: 20 }}>🇪🇨</div>
                      Todo Ecuador
                    </div>
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
