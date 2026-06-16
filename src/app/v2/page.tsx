"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { DEPARTAMENTOS, NOMBRES_DEPARTAMENTOS } from "../colombia";
import { leerTracking, useCapturarTrackingOnMount } from "../_use-tracking";

// === Helpers de formulario ===
// Acepta indicativo +57 / 57 / espacios / guiones — devuelve solo dígitos
function sanitizarTelefonoCO(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  // Si trae el indicativo 57 al inicio y tiene 12 dígitos (57 + 10), quitarlo
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("57")) d = d.slice(2);
  return d;
}
// Verifica que sea celular CO: 10 dígitos empezando en 3
function esCelularCOValido(raw: string): boolean {
  const d = sanitizarTelefonoCO(raw);
  return /^3\d{9}$/.test(d);
}
// Formato visual mientras escribe: "311 389 2990"
function formatearTelefono(raw: string): string {
  const d = sanitizarTelefonoCO(raw).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)} ${d.slice(3)}`;
  return `${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
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

const HERO_IMAGES = [
  { src: "/img/hero-1.webp", alt: "¿Llevas años cansada pensando que es la edad? Síntomas de tiroides" },
  { src: "/img/hero-2.webp", alt: "Hormonas vs MI TIROIDES — repara la causa, no tapa el síntoma" },
  { src: "/img/hero-3.webp", alt: "MI TIROIDES fórmula con 6 ingredientes naturales y dosis" },
  { src: "/img/hero-4.webp", alt: "Tu energía vuelve paso a paso — timeline de 7 a 30 días" },
  { src: "/img/hero-5-v2.webp", alt: "Resultados reales y precio MI TIROIDES — pack 2 frascos" },
];

const SIN_CARA = [
  {
    src: "/img/sincara-1.webp",
    titulo: "7:00 a.m. · Con el desayuno",
    momento: "Día 1",
    caption: "2 cápsulas con el primer alimento del día. El selenio y el zinc se absorben mejor con grasas saludables.",
  },
  {
    src: "/img/sincara-2.webp",
    titulo: "La toma diaria",
    momento: "Cada mañana",
    caption: "1 sola toma al día. Sin recordatorios extra, sin pastilleros complicados — un solo frasco para todo.",
  },
  {
    src: "/img/sincara-3.webp",
    titulo: "Lleva el frasco contigo",
    momento: "Si sales temprano",
    caption: "Cabe en la cartera. Si te vas a la oficina antes de desayunar, te las tomas allá con un café.",
  },
  {
    src: "/img/sincara-4.webp",
    titulo: "Domingo en familia",
    momento: "Día 14",
    caption: "Empieza el cambio: te despiertas con menos pesadez, las mañanas dejan de ser una lucha.",
  },
  {
    src: "/img/sincara-5.webp",
    titulo: "Marca tu progreso",
    momento: "Día 30",
    caption: "Energía estable durante el día. Menos siesta de las 3pm. Empiezas a notar el cabello con más fuerza.",
  },
  {
    src: "/img/sincara-6.webp",
    titulo: "Cierra tu día",
    momento: "Día 60-90",
    caption: "Duermes mejor. La hinchazón al despertar se va. Tu metabolismo y tu humor empiezan a sostenerse solos.",
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
    resumen: "El nutriente con más evidencia para Hashimoto.",
    foto: "/img/ing-selenio.webp",
    porQue:
      "El selenio forma parte de las enzimas glutation-peroxidasa que protegen a la tiroides del daño oxidativo. En Hashimoto la inflamación crónica daña la glándula y el selenio es el escudo natural que la defiende.",
    evidencia: [
      "Meta-análisis 2024 (21 estudios, 1.610 pacientes): reduce anticuerpos TPO de manera significativa.",
      "Pacientes con Hashimoto suelen tener niveles bajos de selenio en sangre.",
      "Forma óptima: L-selenometionina, ~90% de absorción intestinal.",
    ],
    fuentes: "Fuentes naturales: nueces de Brasil, atún, sardinas, huevo.",
  },
  {
    n: "Yodo",
    d: "150 mcg",
    resumen: "La materia prima de las hormonas T3 y T4.",
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
    resumen: "Activa la conversión de T4 en T3.",
    foto: "/img/ing-zinc.webp",
    porQue:
      "T4 es la hormona inactiva; T3 es la activa que da energía. La conversión depende de la enzima deiodinasa que necesita zinc. Sin zinc suficiente, tu cuerpo tiene T4 pero no la puede usar.",
    evidencia: [
      "Mejora la conversión periférica de T4 a T3.",
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
      "T3 y T4 se construyen literalmente uniendo yodo a una molécula de tirosina. Si no tienes suficiente tirosina, tu tiroides no tiene los ladrillos para fabricar hormonas.",
    evidencia: [
      "Aminoácido precursor directo de T3 y T4.",
      "Bien tolerada en dosis de 500 mg/día.",
      "Mejora también la dopamina — relacionada con el ánimo y la concentración.",
    ],
    fuentes: "Fuentes naturales: huevos, lácteos, pollo, almendras.",
  },
  {
    n: "Vitamina B12",
    d: "500 mcg",
    resumen: "Combate la fatiga característica del hipotiroidismo.",
    foto: "/img/ing-b12.webp",
    porQue:
      "Hasta el 40% de pacientes con hipotiroidismo tiene deficiencia de B12. Esta vitamina es clave para producir energía celular y para el sistema nervioso. Su deficiencia explica gran parte del cansancio crónico.",
    evidencia: [
      "Hasta 40% de pacientes hipotiroideos están deficientes.",
      "Mejora la fatiga, niebla mental y ánimo.",
      "Forma óptima: metilcobalamina (forma activa, no requiere conversión).",
    ],
    fuentes: "Fuentes naturales: carne, pescado, huevo, lácteos.",
  },
  {
    n: "Vitamina D3",
    d: "2000 UI",
    resumen: "El 70% de mujeres colombianas tiene niveles bajos.",
    foto: "/img/ing-d3.webp",
    porQue:
      "La D3 modula el sistema inmune. En enfermedades autoinmunes como Hashimoto, niveles óptimos de D3 reducen la actividad de los anticuerpos contra la tiroides. Además mejora ánimo y energía.",
    evidencia: [
      "70.6% de mujeres colombianas 18-49 tienen niveles subóptimos.",
      "Meta-análisis: la suplementación reduce anticuerpos TPO en Hashimoto.",
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
    label: "1 Frasco",
    precio: 89900,
    original: 89900,
    perDia: 1998,
    tag: null as null | { texto: string; gold?: boolean },
  },
  "2": {
    dias: "90 DÍAS · TRATAMIENTO COMPLETO",
    frascos: 2,
    label: "2 Frascos",
    precio: 129900,
    original: 199800,
    perDia: 1443,
    tag: { texto: "EL MÁS COMPRADO · 8 DE CADA 10", gold: false },
  },
  "3": {
    dias: "135 DÍAS · 4,5 MESES",
    frascos: 3,
    label: "3 Frascos",
    precio: 159900,
    original: 299700,
    perDia: 1184,
    tag: { texto: "EL MÁS BARATO · $1.184/DÍA", gold: true },
  },
} as const;

type Cantidad = keyof typeof PLANES;

const TESTI_CORTOS = [
  {
    foto: "/img/cliente-camila.webp",
    nombre: "Camila",
    edad: 33,
    ciudad: "Medellín",
    texto:
      "Llevaba 3 años con levotiroxina y seguía cansada. Al segundo mes con MI TIROIDES empecé a despertarme con energía.",
  },
  {
    foto: "/img/cliente-marcela.webp",
    nombre: "Luisa",
    edad: 36,
    ciudad: "Pereira",
    texto:
      "Antes pedía a iHerb 4 frascos distintos. Ahora un solo frasco colombiano con todo. Llegó en 3 días con pago contra entrega.",
  },
  {
    foto: "/img/cliente-diana.webp",
    nombre: "Yenifer",
    edad: 44,
    ciudad: "Barranquilla",
    texto:
      "Mi endocrinóloga aprobó complementar con selenio y yodo. Encontrar todo en una cápsula me cambió la vida.",
  },
  {
    foto: "/img/cliente-patricia.webp",
    nombre: "Martha",
    edad: 52,
    ciudad: "Bucaramanga",
    texto:
      "Con la premenopausia mi tiroides se descontroló. En 8 semanas con MI TIROIDES dejé de sentirme tan cansada.",
  },
  {
    foto: "/img/cliente-andrea.webp",
    nombre: "Aura",
    edad: 39,
    ciudad: "Quibdó",
    texto:
      "Pensaba que había engordado pero era inflamación por la tiroides. En 6 semanas dejé de sentirme hinchada al despertar.",
  },
];

const TESTI_LARGOS = [
  {
    foto: "/img/cliente-camila.webp",
    nombre: "Camila Quintero",
    rol: "Contadora · Medellín",
    texto:
      "Trabajo 9 horas frente al computador y llegaba a la casa sin energía para nada. Desde la 4ta semana con MI TIROIDES ya no necesito siesta a las 3pm. Mi esposo fue el primero en notarlo.",
    tag: "Energía recuperada",
  },
  {
    foto: "/img/cliente-marcela.webp",
    nombre: "Luisa Restrepo",
    rol: "Diseñadora · Pereira",
    texto:
      "Yo era la típica que decía 'eso no sirve' con los suplementos. Mi hermana me regaló un frasco. Al mes me desperté sin la cara hinchada por primera vez en años. Ya voy por mi tercer frasco.",
    tag: "Escéptica convertida",
  },
  {
    foto: "/img/cliente-diana.webp",
    nombre: "Yenifer Torres",
    rol: "Profesora · Barranquilla",
    texto:
      "Tengo Hashimoto desde los 25. La medicina sola no me alcanzaba. Mi endocrinóloga aprobó complementar con selenio y yodo. MI TIROIDES tiene todo en una cápsula y mis anticuerpos bajaron en el último examen.",
    tag: "Hashimoto",
  },
  {
    foto: "/img/cliente-patricia.webp",
    nombre: "Martha Vargas",
    rol: "Empresaria · Bucaramanga",
    texto:
      "Con la premenopausia subí 6 kilos sin razón aparente. Mi médica me dijo que era la tiroides. Con MI TIROIDES en 3 meses recuperé energía y empecé a soltar peso sin dietas extremas.",
    tag: "Premenopausia",
  },
  {
    foto: "/img/cliente-andrea.webp",
    nombre: "Aura Patiño",
    rol: "Mamá y emprendedora · Quibdó",
    texto:
      "Después del embarazo me quedó una fatiga horrible y caída de cabello. Probé multivitamínicos genéricos sin resultado. MI TIROIDES fue lo único que de verdad notó la diferencia.",
    tag: "Postparto",
  },
  {
    foto: "/img/cliente-lina.webp",
    nombre: "Doris Herrera",
    rol: "Campesina · Boyacá",
    texto:
      "Paso todo el día trabajando en la finca. Llegaba a la casa sin pilas. Ahora con MI TIROIDES termino el día y me alcanza para hacer mis cosas en la casa. No exagero.",
    tag: "Energía al final del día",
  },
  {
    foto: "/img/cliente-bea.webp",
    nombre: "Beatriz Ochoa",
    rol: "Arquitecta · Medellín",
    texto:
      "A los 39 años empecé a notar caída de cabello brutal. Mi médica me dijo que era hipotiroidismo. Con MI TIROIDES en el segundo mes la caída bajó muchísimo y volví a verme el cabello con cuerpo.",
    tag: "Caída de cabello",
  },
  {
    foto: "/img/cliente-rosa.webp",
    nombre: "Rosa Pinto",
    rol: "Comerciante · Villavicencio",
    texto:
      "En el llano hace mucho calor pero yo me la pasaba con frío todo el tiempo. Era la tiroides. Tomé MI TIROIDES juicios 2 frascos y ya no soy la única tapada en la casa.",
    tag: "Frío constante",
  },
  {
    foto: "/img/cliente-sofia.webp",
    nombre: "Sofía Ramírez",
    rol: "Estudiante de medicina · Manizales",
    texto:
      "Estudio 10 horas al día y no me podía concentrar. Mi endocrinólogo me explicó que la niebla mental es un síntoma común. Con MI TIROIDES llevo 3 meses y mi memoria mejoró notablemente.",
    tag: "Niebla mental",
  },
  {
    foto: "/img/cliente-elena.webp",
    nombre: "Elena Cifuentes",
    rol: "Pensionada · Bogotá",
    texto:
      "A los 55 estaba desanimada, sin ganas de salir. Mi hija insistió que probara. Hoy estoy en el cuarto frasco y vuelvo al gimnasio dos veces por semana. Recuperé las ganas.",
    tag: "+55 años",
  },
  {
    foto: "/img/cliente-juliana.webp",
    nombre: "Juliana Quenán",
    rol: "Profesora · Pasto",
    texto:
      "En el sur el yodo de la dieta es bajo y muchas mujeres aquí tenemos tiroides. MI TIROIDES llegó hasta Pasto en 4 días y desde el segundo mes ya siento la diferencia.",
    tag: "Sur de Colombia",
  },
  {
    foto: "/img/cliente-paula.webp",
    nombre: "Paula Mosquera",
    rol: "Líder comunitaria · Quibdó",
    texto:
      "En el Chocó conseguir un suplemento decente era misión imposible. MI TIROIDES nos llega contra entrega y la fórmula es justo lo que la endocrinóloga me había recomendado.",
    tag: "Pacífico colombiano",
  },
];

export default function PageWrapper() {
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}

function Page() {
  useCapturarTrackingOnMount();
  const searchParams = useSearchParams();
  const planFromQuiz = searchParams.get("plan");
  const fromQuiz = searchParams.get("from") === "quiz";
  const scoreFromQuiz = searchParams.get("score");
  const initialCantidad: Cantidad =
    planFromQuiz === "1" || planFromQuiz === "2" || planFromQuiz === "3"
      ? planFromQuiz
      : "3";
  const [cantidad, setCantidad] = useState<Cantidad>(initialCantidad);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState<{ id: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [ingActivo, setIngActivo] = useState<Ingrediente | null>(null);
  const [depto, setDepto] = useState("");
  const [ciudad, setCiudad] = useState("");
  // Fix #2/#4 — campos controlados para validar y autosave
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [referencia, setReferencia] = useState("");
  // Fix #3 — autocompletar ciudad
  const [ciudadInput, setCiudadInput] = useState("");
  const [ciudadFocus, setCiudadFocus] = useState(false);
  // Para evitar pings al bot mientras escribe
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

  // ⚙️ A/B TESTING — Variante B (precios subidos + ganchos urgencia)
  const VARIANT = "v2";

  // === Fix #4: Restore desde localStorage al abrir el modal ===
  useEffect(() => {
    if (!modalOpen) return;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return;
      const d: FormDraft = JSON.parse(raw);
      // Si tiene menos de 24h, restauramos
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

  // === Fix #4: Autosave + ping al bot para recuperación si hay tel + nombre ===
  useEffect(() => {
    if (!modalOpen) return;
    if (!nombre && !telefono && !direccion) return;
    const draft: FormDraft = {
      nombre, telefono, direccion, referencia,
      departamento: depto, ciudad, cantidad, ts: Date.now(),
    };
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft)); } catch {}

    // Ping al endpoint de abandono (con debounce 8s) para activar follow-up tipo Camila
    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    if (esCelularCOValido(telefono) && nombre.trim().length >= 2) {
      abandonTimer.current = setTimeout(() => {
        const tel = sanitizarTelefonoCO(telefono);
        try {
          // BUG FIX 2026-06-16: el beacon no incluía tracking (utm/fbclid/ttclid),
          // por eso los preliminares aparecían como "Sin atribuir" en el pipeline.
          const tracking = leerTracking();
          const blob = new Blob([JSON.stringify({
            tipo: "abandono_form",
            nombre: nombre.trim(),
            telefono: tel,
            departamento: depto || null,
            ciudad: ciudad || null,
            direccion: direccion || null,
            cantidad,
            variant: VARIANT,
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
  }, [modalOpen, nombre, telefono, direccion, referencia, depto, ciudad, cantidad]);

  // Track view (1 vez por pageload)
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tipo: "view", variant: VARIANT }),
    }).catch(() => {});

    // Si viene del quiz, registrar landed
    if (fromQuiz && scoreFromQuiz) {
      window.fbq?.("trackCustom", "QuizLanding", {
        score: Number(scoreFromQuiz),
        plan: planFromQuiz,
      });
      fetch("/api/track-quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event: "landed_landing",
          score: Number(scoreFromQuiz),
          plan: planFromQuiz,
        }),
      }).catch(() => {});
    }
  }, [fromQuiz, scoreFromQuiz, planFromQuiz]);

  function openModal() {
    setOk(false);
    setError(null);
    setModalOpen(true);
    // Meta Pixel: usuario inició proceso de compra (abrió modal)
    const value = PLANES[cantidad].precio;
    window.fbq?.("track", "InitiateCheckout", {
      value,
      currency: "COP",
      content_ids: [`mi-tiroides-${cantidad}-frascos`],
      content_type: "product",
      content_category: VARIANT,
      num_items: PLANES[cantidad].frascos,
    });
    window.gtag?.("event", "begin_checkout", { value, currency: "COP", variant: VARIANT });
    // TikTok Pixel: inicio de checkout
    window.ttq?.track("InitiateCheckout", {
      value,
      currency: "COP",
      content_id: `mi-tiroides-${cantidad}-frascos`,
      content_type: "product",
      content_name: PLANES[cantidad].label,
      quantity: PLANES[cantidad].frascos,
    });
    // Track apertura de form
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tipo: "open_form", variant: VARIANT }),
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
      content_category: VARIANT,
      content_name: PLANES[cantidad].label,
    });
    window.gtag?.("event", "generate_lead", { value, currency: "COP", variant: VARIANT });
    // TikTok Pixel: submit form
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
      content_category: VARIANT,
      num_items: PLANES[cantidad].frascos,
    }, { eventID: eventId });
    window.gtag?.("event", "purchase", { value, currency: "COP", transaction_id: eventId, variant: VARIANT });
    // TikTok Pixel: pago completado (event_id para dedup con Events API server-side)
    window.ttq?.track("CompletePayment", {
      value,
      currency: "COP",
      content_id: `mi-tiroides-${cantidad}-frascos`,
      content_type: "product",
      content_name: PLANES[cantidad].label,
      quantity: PLANES[cantidad].frascos,
    }, { event_id: eventId });
  }

  // Validación COMPUTADA en tiempo real — usada para deshabilitar el botón
  // hasta que TODOS los campos estén OK. Evita envíos con ciudad vacía / depto
  // vacío / ciudad que no matchea con la lista oficial del depto seleccionado.
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

    // Fix #2 — validación de teléfono CO real
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
    const tracking = leerTracking();
    const data = {
      nombre: nombre.trim(),
      telefono: telSanitizado,
      departamento: depto,
      ciudad,
      referencia: referencia.trim(),
      direccion: direccion.trim(),
      cantidad,
      variant: VARIANT,
      total: PLANES[cantidad as Cantidad].precio,
      ...tracking,
    };
    const plan = PLANES[cantidad];
    const total = plan.precio;

    // Anti-duplicado: si ya hicieron Purchase en los últimos 10 min con mismo telefono+plan, no fires Pixel de nuevo
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

    // Fix #6 — flujo de éxito controlado, NO redirige a WhatsApp por defecto
    // El cliente confirma su pedido aquí y opcionalmente puede ir a WhatsApp
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
        // Backup: sendBeacon para que el servidor reciba algo aunque la fetch haya fallado
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

    // Fix #9 — feedback claro al cliente
    if (registroOk) {
      // Limpiar autosave una vez confirmado
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch {}
      setPedidoConfirmado({ id: pedidoId, total });
      setOk(true);
    } else {
      setError("No pudimos registrar tu pedido. Intenta de nuevo o escríbenos por WhatsApp.");
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
            <span key={i}>✦ Envío gratis en tu primer pedido &nbsp;&nbsp; ✦ Pago contra entrega &nbsp;&nbsp;</span>
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
        <div className="container hero">
          <div>
            <div className="hero-img">
              <Image
                src={HERO_IMAGES[heroIdx].src}
                alt={HERO_IMAGES[heroIdx].alt}
                width={896}
                height={1152}
                priority
                key={HERO_IMAGES[heroIdx].src}
              />
            </div>
            <div className="hero-thumbs">
              {HERO_IMAGES.map((img, i) => (
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
            <h1 className="h1">MI TIROIDES Avanzado | Tu tiroides, sin agotamiento</h1>
            <div className="rating-row">
              <span className="stars">★★★★★</span>
              <span><strong>4.8/5</strong> basado en +2.500 mujeres colombianas</span>
            </div>
            <p style={{ color: "var(--gris)", fontSize: 16, margin: "0 0 12px" }}>
              El primer suplemento colombiano formulado para acompañar la tiroides cuando el estrés
              crónico la tiene fuera de balance. Selenio, yodo, zinc, L-tirosina, B12 y D3 — los
              nutrientes que el cortisol consume primero, todo en una sola cápsula.
            </p>
            <div className="badges">
              <span className="badge">Vegano</span>
              <span className="badge">Sin gluten</span>
              <span className="badge">Registro INVIMA</span>
              <span className="badge">6 nutrientes</span>
              <span className="badge" style={{ background: "#1f3d2b", color: "#fff", borderColor: "#1f3d2b" }}>
                🌿 Asistente incluido
              </span>
            </div>
            <div className="precio-row">$89.900 COP</div>

            {/* Gancho urgencia psicológica — el cuerpo no espera */}
            <div
              style={{
                background: "rgba(184, 90, 30, .08)",
                borderLeft: "4px solid #b85a1e",
                padding: "12px 14px",
                borderRadius: 8,
                margin: "10px 0 14px",
                fontSize: 14,
                lineHeight: 1.5,
                color: "#3a2415",
              }}
            >
              ⏰ <strong>Tu metabolismo no espera.</strong> Cada semana sin
              tratar es otra semana de fatiga, caída de cabello y variaciones
              en tu peso. Empezar hoy = primeros cambios en <strong>14 días</strong>.
            </div>

            <button className="btn btn-block" onClick={openModal}>
              Empezar mi cambio HOY · Pago contra entrega
            </button>
            <div className="hero-checks">
              <div>Sin suscripción</div>
              <div>Envío gratis en tu primer pedido</div>
              <div>Garantía de satisfacción 30 días</div>
            </div>
          </div>
        </div>
      </section>

      {/* MINI TESTIMONIOS */}
      <section className="section-tight section-beige">
        <div className="container">
          <div className="eyebrow">¿Qué dicen nuestras clientas?</div>
          <div className="review-strip">
            <div className="avatar-stack">
              {avatarStackShuffled.slice(0, 4).map((t) => (
                <div key={t.foto} className="avatar avatar-photo">
                  <Image src={t.foto} alt={t.nombre} width={80} height={80} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, color: "var(--gris)" }}>
              <strong style={{ color: "var(--tinta)" }}>+2.500 clientas felices</strong>
              <div><span className="stars">★★★★★</span> Excelente 4.8</div>
            </div>
          </div>

          <div className="testi-scroller">
            <div className="testi-track">
              {testiCortosShuffled.map((t) => (
                <div key={t.foto} className="testi-card">
                  <div className="cliente-foto">
                    <Image src={t.foto} alt={t.nombre} width={420} height={340} />
                  </div>
                  <div className="stars">★★★★★</div>
                  <p>“{t.texto}”</p>
                  <footer>
                    <div>
                      <strong>{t.nombre}, {t.edad}</strong>
                      <span>{t.ciudad} · Verificado</span>
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
          <div className="eyebrow">¿Te suena familiar?</div>
          <h2 className="h2">Tomas tu levotiroxina, comes bien, descansas…<br />pero sigues sintiéndote agotada</h2>
          <div className="dolor-grid">
            {[
              ["🥱", "Cansancio constante", "Te despiertas agotada y al mediodía ya no puedes más, aunque dormiste bien."],
              ["⚖️", "Peso que no baja", "Cuidas tu alimentación pero los kilos no se mueven o suben sin explicación."],
              ["💇‍♀️", "Caída del cabello", "Encuentras pelo en la almohada, en la ducha y al peinarte cada mañana."],
              ["🧠", "Niebla mental", "Olvidas cosas, te cuesta concentrarte y sientes que tu cabeza va lenta."],
              ["🥶", "Frío constante", "Manos y pies fríos aunque haga buen clima — tus compañeras tienen calor."],
              ["⚡", "Estrés que no suelta", "Vives en alerta, el corazón se acelera, irritabilidad y ansiedad sin motivo claro."],
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
            Si te identificas con al menos 2 de estos puntos,{" "}
            <strong>no es flojera ni edad — es tu tiroides agotada por el estrés y sin los nutrientes correctos.</strong>
          </p>
          <p style={{ textAlign: "center", color: "var(--gris)", maxWidth: 640, margin: "8px auto 0", fontSize: 15 }}>
            La levotiroxina reemplaza la hormona, pero no le da a tu tiroides los nutrientes que necesita
            para funcionar. Por eso muchas mujeres siguen mal aunque sus exámenes salgan “normales”.
          </p>
        </div>
      </section>

      {/* ESTRÉS → TIROIDES — gancho científico */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">La causa que casi nadie te explica</div>
          <h2 className="h2">El estrés crónico es el detonante silencioso de tu tiroides</h2>
          <p className="lead">
            Cuando vives en alerta constante, tu cuerpo libera cortisol durante meses. Ese cortisol
            elevado <strong>frena directamente la conversión de T4 a T3</strong> — la hormona activa
            que tu cuerpo necesita. Resultado: cansancio, peso que no baja, caída de cabello… y más
            estrés. Un círculo del que no se sale solo con dormir más.
          </p>

          <div className="estres-grid">
            <div className="estres-card">
              <div className="estres-num">1</div>
              <strong>Estrés sostenido</strong>
              <p>Trabajo, hijos, familia, finanzas. Tu cuerpo entra en modo supervivencia y no sale.</p>
            </div>
            <div className="estres-arrow">→</div>
            <div className="estres-card">
              <div className="estres-num">2</div>
              <strong>Cortisol elevado</strong>
              <p>Tu cuerpo gasta selenio, zinc, magnesio y B12 a una velocidad 3x más rápida.</p>
            </div>
            <div className="estres-arrow">→</div>
            <div className="estres-card">
              <div className="estres-num">3</div>
              <strong>Tiroides sin combustible</strong>
              <p>Sin esos minerales, no produce T3 activa. Te sientes cansada aunque tu TSH salga “normal”.</p>
            </div>
          </div>

          <div className="estres-cierre">
            <div className="estres-cierre-titulo">¿Cómo te ayuda MI TIROIDES?</div>
            <ul className="estres-lista">
              <li><strong>Selenio + Zinc:</strong> reponen lo que el cortisol drena cada día.</li>
              <li><strong>L-Tirosina:</strong> la materia prima de la hormona tiroidea — esencial bajo estrés.</li>
              <li><strong>B12 + D3:</strong> reducen la fatiga adrenal y estabilizan el estado de ánimo.</li>
              <li><strong>Yodo:</strong> repone las reservas que se queman cuando vives en alerta.</li>
            </ul>
            <p className="estres-disclaimer">
              MI TIROIDES no es un ansiolítico. Es el soporte nutricional que tu tiroides necesita para
              recuperarse del impacto del estrés crónico. Combínalo con sueño, movimiento y respiración —
              y verás resultados reales en 60-90 días.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARATIVA - tabla horizontal */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">Compara y decide</div>
          <h2 className="h2">¿Por qué elegir MI TIROIDES?</h2>
          <p className="lead">Compara de un vistazo cada alternativa para tu tiroides.</p>

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
            .ctable-v2 {
              position: relative;
            }
            .ctable-v2::after {
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
              .ctable-v2::after { display: none; }
            }
          `}</style>

          <div className="ctable ctable-v2">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className="ctable-feat">
                    <Image src="/img/bundle-1.webp" alt="MI TIROIDES" width={80} height={80} />
                    <span>MI TIROIDES</span>
                    <small>$89.900 / mes</small>
                    <em className="ctable-tag">RECOMENDADO</em>
                  </th>
                  <th>
                    <div className="ctable-icon">💊</div>
                    <span>Levotiroxina sola</span>
                    <small>Solo medicamento</small>
                  </th>
                  <th>
                    <div className="ctable-icon">📦</div>
                    <span>Importados iHerb</span>
                    <small>$300K+ / mes</small>
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Fórmula específica tiroides", "yes", "no", "mid"],
                  ["Apoya la causa, no solo síntoma", "yes", "no", "mid"],
                  ["Selenio + Zinc + D3 incluidos", "yes", "no", "yes"],
                  ["Mejora conversión T4 → T3", "yes", "no", "yes"],
                  ["Una sola cápsula al día", "yes", "yes", "no"],
                  ["Hecho en Colombia + INVIMA", "yes", "yes", "no"],
                  ["Sin pago en dólares ni aduana", "yes", "yes", "no"],
                  ["Pago contra entrega", "yes", "no", "no"],
                  ["Garantía 30 días", "yes", "no", "no"],
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
            * MI TIROIDES no reemplaza tu medicamento — lo complementa con los nutrientes que falta aportar.
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
            La diferencia entre <strong>seguir igual en 60 días</strong> o
            sentirte como antes empieza con la decisión que estás a punto de
            tomar.
          </div>
        </div>
      </section>

      {/* FÓRMULA */}
      <section className="section section-verde" id="ingredientes">
        <div className="container">
          <div className="eyebrow">La fórmula</div>
          <h2 className="h2">6 nutrientes. 0 rellenos.</h2>
          <p className="lead">Cada cápsula trae lo que tu tiroides realmente necesita, en dosis con respaldo científico.</p>

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
          <div className="eyebrow">Conoce MI TIROIDES</div>
          <h2 className="h2">Tu ritual diario para una tiroides que rinde</h2>
          <p className="lead">2 cápsulas al día. 10 segundos. Sin sabor, sin preparación.</p>

          <div className="beneficio-grid">
            {[
              {
                tag: "Semanas 2-4",
                t: "Más energía estable",
                d: "Las primeras clientas reportan despertarse con más energía y dejar de necesitar siesta a media tarde.",
              },
              {
                tag: "Mes 2",
                t: "Menos caída de cabello",
                d: "Al recibir selenio, zinc y B12, los folículos capilares recuperan vitalidad y la caída disminuye.",
              },
              {
                tag: "Meses 2-3",
                t: "Peso más estable",
                d: "Al apoyar la conversión de T4 en T3 (la hormona activa), el metabolismo recupera su ritmo natural.",
              },
              {
                tag: "Uso continuo",
                t: "Mejor estado de ánimo",
                d: "B12 y D3 son nutrientes clave para regular el ánimo. La gran mayoría reporta sentirse menos irritable.",
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

      {/* DOCTORA */}
      <section className="section">
        <div className="container" style={{ display: "grid", gap: 30, alignItems: "center", gridTemplateColumns: "1fr" }}>
          <div style={{ display: "grid", gap: 30, gridTemplateColumns: "1fr", alignItems: "center" }}>
            <Image
              src="/img/doctora.webp"
              alt="Dra. Ana López, Endocrinóloga"
              width={500}
              height={600}
              style={{ borderRadius: 18, margin: "0 auto" }}
            />
            <div>
              <div className="eyebrow" style={{ textAlign: "left" }}>Respaldo médico</div>
              <h2 className="h2" style={{ textAlign: "left" }}>Formulado con respaldo de endocrinología</h2>
              <p style={{ fontSize: 17, lineHeight: 1.6 }}>
                <strong style={{ color: "var(--verde)" }}>“MI TIROIDES Avanzado no reemplaza tu medicamento — lo complementa.</strong>{" "}
                La fórmula reúne, en dosis correctas, los nutrientes que más vemos deficitarios en
                mujeres con hipotiroidismo y Hashimoto en Colombia.”
              </p>
              <p style={{ color: "var(--gris)", fontSize: 14 }}>
                — Dra. Ana López, Endocrinología · Bogotá · Universidad Javeriana
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRATAMIENTO 3 MESES */}
      <section className="section section-verde">
        <div className="container-sm" style={{ textAlign: "center" }}>
          <div className="eyebrow">Importante</div>
          <h2 className="h2">Esto es un tratamiento, no una pastilla milagrosa</h2>
          <p className="lead" style={{ color: "#d6cdb3" }}>
            Tu tiroides tarda en recibir, asimilar y reflejar los nutrientes en tus síntomas.
            Por eso recomendamos un <strong style={{ color: "#fff" }}>mínimo de 3 meses continuos</strong> para ver
            cambios reales en energía, peso y caída de cabello.
          </p>
          <p style={{ color: "#d6cdb3", marginTop: 12 }}>
            Las clientas que abandonan al primer mes no ven resultados.
            <br />
            <strong style={{ color: "#fff" }}>Las que completan los 3 meses, sí.</strong>
          </p>
        </div>
      </section>

      {/* STATS RESULTADOS */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Resultados reales</div>
          <h2 className="h2">Lo que reportan nuestras clientas en 90 días</h2>
          <div className="stats-grid">
            {[
              ["88%", "Reportan más energía y menos fatiga matutina al mes 2 de uso continuo"],
              ["91%", "Notan menor caída del cabello tras 8 semanas"],
              ["79%", "Sienten que su peso se estabiliza o baja sin cambios extremos en la dieta"],
              ["94%", "Volverían a comprar y lo recomendarían a una amiga o familiar"],
            ].map(([n, t]) => (
              <div key={n} className="stat-card">
                <div className="stat-num">{n}</div>
                <p>{t}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "var(--gris)", marginTop: 22, fontSize: 12 }}>
            *Encuesta interna a clientas con 90 días de uso continuo. Resultados individuales varían.
          </p>
        </div>
      </section>

      {/* TESTIMONIOS LARGOS */}
      <section className="section section-beige" id="testimonios">
        <div className="container">
          <div className="eyebrow">Historias reales</div>
          <h2 className="h2">Aprobadas por +2.500 colombianas</h2>
          <p className="lead">Profesionales, mamás y emprendedoras que recuperaron su energía.</p>

          <div className="testi-scroller">
            <div className="testi-track">
              {testiLargosShuffled.map((t) => (
                <div key={t.foto} className="testi-card">
                  <div className="cliente-foto">
                    <Image src={t.foto} alt={t.nombre} width={420} height={340} />
                  </div>
                  <footer style={{ borderBottom: "1px solid #e6dfcc", paddingBottom: 12, marginTop: 0 }}>
                    <div>
                      <strong>{t.nombre}</strong>
                      <span>{t.rol}</span>
                    </div>
                  </footer>
                  <p>{t.texto}</p>
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
          <div className="eyebrow">Cómo se toma · Qué vas a sentir</div>
          <h2 className="h2">Un ritual simple, cambios reales en 90 días</h2>
          <p className="lead">
            <strong>2 cápsulas, 1 vez al día, con el desayuno.</strong> Eso es todo. Aquí te mostramos cuándo
            tomarlo y qué cambios reportan las mujeres que ya lo usan, semana a semana.
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
            <strong>¿Y si me olvido un día?</strong> No pasa nada — la suplementación tiroidea funciona por
            acumulación, no por una sola dosis. Solo retoma al día siguiente con tu desayuno.
          </div>
        </div>
      </section>

      {/* ancla invisible para <a href="#comprar"> en la nav */}
      <span id="comprar" />

      {/* ASISTENTE INCLUIDO */}
      <section className="section section-beige" id="asistente">
        <div className="container-sm">
          <div className="eyebrow" style={{ color: "#c9a14a" }}>Incluido sin costo</div>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            No estás sola en tu tratamiento.
          </h2>
          <p style={{ color: "var(--gris)", fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
            Con cada pedido recibes acceso GRATIS a tu <strong>asistente personal de bienestar</strong> por WhatsApp, que te acompaña durante todo el tratamiento.
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
              { i: "🥗", t: "Alimentos ideales para tu tiroides", d: "Cada semana te enviamos qué incluir y qué evitar según tu etapa del tratamiento." },
              { i: "🌱", t: "Hábitos clave cada semana", d: "Pequeños cambios graduales (sueño, estrés, movimiento) que potencian el efecto del suplemento." },
              { i: "📊", t: "Seguimiento de tu progreso", d: "Te escribimos cada 7-14 días para saber cómo te sientes y ajustar la guía." },
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
            <strong style={{ color: "#1f3d2b" }}>Importante:</strong> el asistente no reemplaza al médico — es un acompañamiento de hábitos y nutrición. Para temas clínicos siempre te recomendamos consultar a tu especialista.
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-beige" id="faq">
        <div className="container-sm">
          <div className="eyebrow">Preguntas frecuentes</div>
          <h2 className="h2">Resolvemos tus dudas</h2>

          <div className="faq">
            <details>
              <summary>¿Cuándo veo resultados?</summary>
              <p>
                La mayoría de clientas reporta más energía entre la 4ª y 6ª semana. Cambios en peso,
                cabello y ánimo se ven con más claridad entre el 2º y 3er mes. Por eso lo presentamos
                como un tratamiento de 3 meses.
              </p>
            </details>
            <details>
              <summary>¿Sirve si mi problema es más estrés que tiroides?</summary>
              <p>
                Sí — y de hecho ahí es donde más se nota. El estrés crónico drena el selenio, zinc, B12
                y magnesio que tu tiroides necesita para producir T3 activa. MI TIROIDES repone esos
                nutrientes y le da a tu cuerpo el soporte para salir del modo supervivencia. No es un
                ansiolítico, pero rompe el círculo de “estrés → tiroides agotada → más cansancio → más
                estrés”. Combínalo con sueño y respiración para resultados más rápidos.
              </p>
            </details>
            <details>
              <summary>¿Tiene efectos secundarios?</summary>
              <p>
                La fórmula usa dosis fisiológicas seguras. Si tienes una condición renal, hepática o
                estás embarazada, consulta con tu médico antes de comenzar. No mezcla con
                ashwagandha (no incluida por precaución regulatoria).
              </p>
            </details>
            <details>
              <summary>¿Es una suscripción?</summary>
              <p>
                No. Es una compra única. Tú decides cuándo volver a pedir. Sin cargos automáticos.
                Pagas contra entrega cuando el producto llega a tu puerta.
              </p>
            </details>
            <details>
              <summary>¿Tiene registro INVIMA?</summary>
              <p>
                Sí. MI TIROIDES Avanzado cuenta con registro INVIMA y se fabrica en Colombia bajo
                Buenas Prácticas de Manufactura.
              </p>
            </details>
            <details>
              <summary>¿Cómo se toma?</summary>
              <p>
                2 cápsulas al día con las comidas. Cada frasco trae 90 cápsulas — alcanza para 45 días.
                Para resultados óptimos: 2 frascos = 90 días = el tratamiento completo de 3 meses.
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

      {/* CIERRE */}
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
              ¿Cuánto vale otra semana sintiéndote agotada?
            </h2>
            <p style={{ color: "var(--tinta)", fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              Llevas meses preguntándote si esto va a pasar solo. Pero la
              tiroides no se regula sola cuando el cortisol está alto y faltan
              nutrientes específicos. <strong>Cada día que pospones es otro día
              sumándose al cansancio</strong>, otro día viendo más cabello en el
              cepillo, otro día con esa niebla que no te deja pensar.
              <br /><br />
              <strong style={{ color: "#1f3d2b" }}>
                $89.900 hoy &nbsp;vs&nbsp; otro mes igual a este.
              </strong>{" "}
              Esa es la decisión real.
            </p>
          </div>
        </div>
      </section>

      <section className="section section-verde">
        <div className="container-sm" style={{ textAlign: "center" }}>
          <h2 className="h2">¿Lista para empezar tu tratamiento?</h2>
          <p style={{ color: "#d6cdb3", marginBottom: 26 }}>
            Más de 2.500 mujeres colombianas ya están recuperando su energía con MI TIROIDES.
          </p>
          <button className="btn btn-light" onClick={openModal}>
            Sí, quiero empezar mi cambio HOY →
          </button>
          <p style={{ color: "#d6cdb3", marginTop: 16, fontSize: 14, fontStyle: "italic" }}>
            Pago contra entrega · Llega en 24-72h · 30 días de garantía
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          MI TIROIDES Avanzado · Hecho en Colombia · Registro INVIMA
          <br />
          Este producto no reemplaza el tratamiento médico. Consulta a tu profesional de salud.
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
              <h4 style={{ margin: "16px 0 6px", color: "var(--verde)" }}>¿Por qué se usa contra la tiroides?</h4>
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

      {/* MODAL DE COMPRA */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Cerrar">×</button>

            <div className="modal-head">
              <div className="modal-logo">
                <strong>MI TIROIDES</strong>
                <span>Avanzado · Hecho en Colombia</span>
              </div>
              <div className="modal-pill">+2.500 clientas felices</div>
              <div className="modal-trustline">
                <span>📦 Envíos rápidos</span>
                <span>💵 Paga al recibir</span>
                <span>🇨🇴 Hecho en Colombia</span>
              </div>
              {/* Gancho urgencia dentro del modal — el momento más crítico */}
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
                ⏱️ <strong>Tu pedido sale despachado en las próximas 24h.</strong>{" "}
                Empiezas el tratamiento esta semana = primeros cambios en{" "}
                <strong>14 días</strong>.
              </div>
            </div>

            {ok && pedidoConfirmado ? (
              /* Fix #6 + #9 — success modal claro con ID, sin redirección forzada */
              <div className="modal-success" style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 6 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#1f3d2b" }}>
                  ¡Pedido recibido!
                </h3>
                <p style={{ color: "var(--gris)", margin: "0 0 14px", lineHeight: 1.5 }}>
                  Te contactamos por WhatsApp en las próximas horas para confirmar la dirección y la fecha de entrega.
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
                  ¿Quieres adelantar la confirmación? Escríbenos por WhatsApp con tu número de pedido.
                </p>

                <a
                  className="btn btn-block"
                  href={`https://wa.me/573237451763?text=${encodeURIComponent(
                    `¡Hola! Soy ${nombre || 'una clienta nueva'} y acabo de hacer mi pedido en MI TIROIDES.\n\n` +
                    `- ${cantidad} frasco${cantidad !== '1' ? 's' : ''}\n` +
                    `- $${pedidoConfirmado.total.toLocaleString('es-CO')} contra entrega\n` +
                    (ciudad ? `- ${ciudad}\n` : '') +
                    (direccion ? `- ${direccion}\n` : '') +
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
                            src={`/img/bundle-${p.frascos}.webp`}
                            alt={p.label}
                            width={300}
                            height={300}
                          />
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

                {/* MÉTODO DE ENVÍO */}
                <div className="modal-section-title">Método de envío</div>
                <div className="modal-shipping">
                  <span className="modal-radio active" />
                  <strong>Envío gratis</strong>
                  <span style={{ marginLeft: "auto", color: "var(--gris)" }}>Gratis</span>
                </div>

                {/* DATOS */}
                <div className="modal-section-title green">Ingresa tu dirección de envío</div>
                <form className="modal-form" onSubmit={onSubmit} noValidate>
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
                      <input
                        name="nombre"
                        required
                        placeholder="Laura Pérez"
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
                        placeholder="Calle 122 #87-29 Apto 1302"
                        autoComplete="street-address"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                      />
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

                  {/* Fix #3 — ciudad como autocompletar/typeahead */}
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
                    <span className="modal-label">Barrio y punto de referencia <em>*</em></span>
                    <div className="modal-input-icon">
                      <span>🧭</span>
                      <input
                        name="referencia"
                        required
                        placeholder="Ej: Barrio Cedritos, frente al ARA"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                      />
                    </div>
                  </label>

                  {/* BLOQUE ASISTENTE INCLUIDO */}
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
                        <ul
                          style={{
                            margin: "6px 0 0",
                            paddingLeft: 18,
                            fontSize: 12,
                            color: "#1f3d2b",
                            lineHeight: 1.6,
                          }}
                        >
                          <li>Alimentos ideales para tu tiroides</li>
                          <li>Hábitos clave cada semana</li>
                          <li>Seguimiento de tu progreso</li>
                          <li>Resuelve dudas cuando quieras</li>
                          <li>
                            <strong>Precios especiales</strong> al renovar tu tratamiento
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* RESUMEN */}
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

                  {/* Fix #7 — frase tranquila encima del botón, sin urgencia falsa */}
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
                    📦 No pagas nada ahora. Te llega a tu casa y pagas cuando lo recibes.
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

                  {/* Fix #5 — botón con info clara debajo */}
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
                          ${plan.precio.toLocaleString("es-CO")} · Envío gratis · Garantía 30 días
                        </span>
                      </>
                    )}
                  </button>

                  {/* Fix #8 — trust badges debajo del botón, sin claims de devolver plata */}
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
                      Llega en 1-3 días
                    </div>
                    <div>
                      <div style={{ fontSize: 20 }}>🇨🇴</div>
                      Hecho en Colombia
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
