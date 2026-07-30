"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { DEPARTAMENTOS, NOMBRES_DEPARTAMENTOS } from "../colombia";
import { leerTracking, useCapturarTrackingOnMount } from "../_use-tracking";

// === Helpers de formulario ===
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

// Primer slide del carrusel = hero DISEÑADO que hace message-match con cada ad (por ?angle).
// Avatar mujeres 45-55 (hinchazón/gordura por hipotiroidismo). 4 ángulos = los 4 ads:
// agua (ES AGUA NO ES USTED) · pastilla (SU PASTILLA NO TRABAJA SOLA) · secreto (EL SECRETO) · esponja (LA ESPONJA).
// TODO: reemplazar por 4 heroes diseñados message-match (Higgsfield, crema/verde/dorado + frasco real).
// Por ahora reusan el slide diseñado original de señora (hero-1) para que se vea pulido de una.
const HERO_MUJER: Record<"agua" | "pastilla" | "secreto" | "esponja", { src: string; alt: string }> = {
  agua: { src: "/img/hero-1.webp", alt: "No engordó, se inflamó: es agua, no grasa — es su tiroides" },
  pastilla: { src: "/img/hero-1.webp", alt: "Su pastilla de la tiroides no trabaja sola: le faltan 6 nutrientes" },
  secreto: { src: "/img/hero-1.webp", alt: "El secreto que nadie le dijo sobre su barriga y su cansancio" },
  esponja: { src: "/img/hero-1.webp", alt: "Su cuerpo guarda agua como una esponja: así se desinflama" },
};

// Slides neutrales diseñados (sirven al avatar 45-55).
const HERO_RESTO = [
  { src: "/img/hero-2.webp", alt: "Hormonas vs MI TIROIDES — repara la causa, no tapa el síntoma" },
  { src: "/img/hero-3.webp", alt: "MI TIROIDES fórmula con 6 ingredientes naturales y dosis" },
  { src: "/img/hero-4.webp", alt: "Su energía vuelve paso a paso — timeline de 7 a 30 días" },
  { src: "/img/hero-5.webp", alt: "Resultados reales y precio MI TIROIDES — pack 2 frascos" },
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
    caption: "Energía estable durante el día. Menos siesta de las 3pm. Empieza a notar el estómago menos inflado.",
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
    precio: 119900,
    original: 179800,
    perDia: 1332,
    tag: { texto: "EL MÁS COMPRADO · 8 DE CADA 10", gold: false },
  },
  "3": {
    dias: "135 DÍAS · 4,5 MESES",
    frascos: 3,
    label: "3 Frascos",
    precio: 139900,
    original: 269700,
    perDia: 1036,
    tag: { texto: "EL MÁS BARATO · $1.036/DÍA", gold: true },
  },
} as const;

type Cantidad = keyof typeof PLANES;

const TESTI_CORTOS = [
  {
    foto: "/img/cliente-patricia.webp",
    nombre: "Patricia",
    edad: 52,
    ciudad: "Bogotá",
    texto:
      "Comía igual de siempre y el cuerpo no bajaba. No era grasa, era agua. Al segundo mes me desinflamé y la ropa me volvió a cerrar.",
  },
  {
    foto: "/img/cliente-marcela.webp",
    nombre: "Marcela",
    edad: 49,
    ciudad: "Cali",
    texto:
      "Llevaba años con la levotiroxina y seguía hinchada y cansada. Con MI TIROIDES, que va con mi pastilla, por fin dejé de amanecer con la cara hinchada.",
  },
  {
    foto: "/img/cliente-rosa.webp",
    nombre: "Rosa",
    edad: 55,
    ciudad: "Barranquilla",
    texto:
      "Me decían que era falta de disciplina. Era mi tiroides lenta reteniendo líquido. En unas semanas volví a sentirme liviana y con energía.",
  },
  {
    foto: "/img/cliente-elena.webp",
    nombre: "Elena",
    edad: 47,
    ciudad: "Medellín",
    texto:
      "Vivía pesada, con la barriga inflada y sin fuerzas. Al mes se me bajó la hinchazón del estómago y dejé la siesta de las 3 p. m.",
  },
];

const TESTI_LARGOS = [
  {
    foto: "/img/cliente-patricia.webp",
    nombre: "Patricia Gómez",
    rol: "Ama de casa · 52 · Bogotá",
    texto:
      "Yo juraba que era grasa de tanto encierro. Comía lo mismo de siempre y el cuerpo seguía inflado. Desde la 4ta semana con MI TIROIDES se me bajó la hinchazón y la ropa me volvió a cerrar sin dietas locas. No era falta de disciplina, era el agua que retenía.",
    tag: "Es agua, no grasa",
  },
  {
    foto: "/img/cliente-marcela.webp",
    nombre: "Marcela Ríos",
    rol: "Secretaria · 49 · Cali",
    texto:
      "Tomo mi levotiroxina hace años y aun así vivía hinchada y sin fuerzas. Mi médica me dijo que la pastilla repone la hormona pero no le da a la tiroides los nutrientes que necesita. MI TIROIDES va con mi pastilla, no la reemplaza, y por fin dejé de amanecer con la cara hinchada.",
    tag: "Va con mi pastilla",
  },
  {
    foto: "/img/cliente-rosa.webp",
    nombre: "Rosa Meza",
    rol: "Comerciante · 55 · Barranquilla",
    texto:
      "Toda la vida me dijeron 'coma menos, camine más'. Nadie me revisó la tiroides. Cuando entendí que estaba lenta y por eso retenía líquido, todo cuadró. Con MI TIROIDES en el segundo mes me sentí liviana por primera vez en años.",
    tag: "El secreto que nadie le dijo",
  },
  {
    foto: "/img/cliente-elena.webp",
    nombre: "Elena Valencia",
    rol: "Modista · 47 · Medellín",
    texto:
      "Amanecía como una esponja: hinchada, pesada y con la mente nublada. Me costaba hasta acordarme de las cosas. Con MI TIROIDES fui soltando el líquido, se me desinfló el estómago y la cabeza se me despejó.",
    tag: "Vivía hinchada",
  },
  {
    foto: "/img/cliente-diana.webp",
    nombre: "Diana Cárdenas",
    rol: "Enfermera · 51 · Bucaramanga",
    texto:
      "Yo era la típica que decía 'eso no sirve'. Mi hermana me regaló un frasco. Al mes me desperté sin la cara hinchada por primera vez en años y con energía para el turno completo. Ya voy por mi tercer frasco.",
    tag: "Escéptica convertida",
  },
  {
    foto: "/img/cliente-juliana.webp",
    nombre: "Juliana Portilla",
    rol: "Docente pensionada · 58 · Pasto",
    texto:
      "Después de la menopausia el cuerpo se me apagó: frío, cansancio y el estómago siempre inflado. Mi endocrinóloga aprobó complementar con selenio y yodo. MI TIROIDES los tiene todos en una cápsula y me devolvió la energía.",
    tag: "Energía recuperada",
  },
  {
    foto: "/img/cliente-lina.webp",
    nombre: "Lina Ospina",
    rol: "Auxiliar contable · 45 · Manizales",
    texto:
      "Trabajo sentada todo el día y llegaba a la casa sin fuerzas, con las piernas hinchadas. Mi doctora me habló de la tiroides. Con MI TIROIDES se me bajó la hinchazón de las piernas y volví a caminar sin sentirme pesada.",
    tag: "Menos hinchazón",
  },
];

const ANGULOS: Record<"agua" | "pastilla" | "secreto" | "esponja", { h1: string; sub: string }> = {
  agua: {
    h1: "No engordó. Se inflamó. Es agua, no grasa.",
    sub: "Come igual que siempre y el cuerpo no baja. No es falta de disciplina: cuando la tiroides se pone lenta, el cuerpo retiene líquido y se inflama. Los 6 nutrientes que ayudan a su tiroides a volver a trabajar — para desinflamar y recuperar la energía. Va con su pastilla, no la reemplaza.",
  },
  pastilla: {
    h1: "Su pastilla de la tiroides no trabaja sola.",
    sub: "Toma la levotiroxina juiciosa y aun así vive hinchada, cansada y con el cuerpo pesado. Esa pastilla repone la hormona, pero no le da a su tiroides el selenio, yodo, zinc, L-tirosina, B12 y D3 que necesita para funcionar. En una sola cápsula. Va con su Eutirox, no lo reemplaza.",
  },
  secreto: {
    h1: "El secreto que nadie le dijo sobre su barriga.",
    sub: "No es floja ni comió de más. Casi nadie le revisa la glándula que decide si su cuerpo guarda o suelta el líquido: la tiroides. Cuando se pone lenta, usted se hincha y se cansa. Los 6 nutrientes que la ayudan a reactivarse — para desinflamar y volver a sentirse liviana.",
  },
  esponja: {
    h1: "Su cuerpo guarda agua como una esponja mojada.",
    sub: "Cuando la tiroides está lenta, el cuerpo retiene líquido y usted amanece hinchada, pesada y con la mente nublada. Los 6 nutrientes que ayudan a su tiroides a “exprimir esa esponja” — desinflamar, soltar el líquido y recuperar la energía. Va con su pastilla, no la reemplaza.",
  },
};

export default function Page() {
  useCapturarTrackingOnMount();
  const [cantidad, setCantidad] = useState<Cantidad>("3");
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

  // Track view (1 vez por pageload)
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tipo: "view" }),
    }).catch(() => {});
  }, []);

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
        if (d.departamento) setDepto(d.departamento);
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
      departamento: depto, ciudad, cantidad, ts: Date.now(),
    };
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft)); } catch {}

    if (abandonTimer.current) clearTimeout(abandonTimer.current);
    if (esCelularCOValido(telefono) && nombre.trim().length >= 2) {
      abandonTimer.current = setTimeout(() => {
        const tel = sanitizarTelefonoCO(telefono);
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
            departamento: depto || null,
            ciudad: ciudad || null,
            direccion: direccion || null,
            cantidad,
            variant: "v1",
            total: PLANES[cantidad].precio,
            ts: new Date().toISOString(),
            ...tracking,  // utm_source, utm_campaign, utm_content, utm_medium, fbclid, ttclid, referrer
          })], { type: "application/json" });
          navigator.sendBeacon?.("/api/pedido", blob);
        } catch {}
      }, 8000);
    }
    return () => {
      if (abandonTimer.current) clearTimeout(abandonTimer.current);
    };
  }, [modalOpen, nombre, telefono, direccion, referencia, depto, ciudad, cantidad]);

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
      num_items: PLANES[cantidad].frascos,
    });
    window.gtag?.("event", "begin_checkout", { value, currency: "COP" });
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
      num_items: PLANES[cantidad].frascos,
    }, { eventID: eventId });
    window.gtag?.("event", "purchase", { value, currency: "COP", transaction_id: eventId });
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
  // hasta que TODOS los campos estén OK. Esto evita que el cliente envíe
  // el form con ciudad vacía / depto vacío / ciudad que no matchea con la
  // lista oficial del depto seleccionado.
  // La misma lógica se ejecuta en onSubmit como doble seguridad.
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
    // anti-fraude: honeypot (leído del form) + time-to-submit (desde carga de página)
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
      variant: "v1",
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
          // Backend marca valido=true solo cuando ciudad+depto están en lista oficial
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
            <h1 className="h1">{ANGULOS[angulo].h1}</h1>
            <div className="rating-row">
              <span className="stars">★★★★★</span>
              <span><strong>4.8/5</strong> basado en +2.500 mujeres colombianas</span>
            </div>
            <p style={{ color: "var(--gris)", fontSize: 16, margin: "0 0 12px" }}>{ANGULOS[angulo].sub}</p>
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
              ⏰ <strong>Su metabolismo no espera.</strong> Cada semana sin
              tratar es otra semana de hinchazón, cansancio y retención de
              líquido. Empezar hoy = primeros cambios en <strong>14 días</strong>.
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
          <div className="eyebrow">¿Le suena familiar?</div>
          <h2 className="h2">Come bien, se toma su pastilla juiciosa, camina…<br />y aun así vive hinchada y con el cuerpo pesado</h2>
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
              <p>Quema su selenio, zinc y B12 hasta 3x más rápido — justo los que su tiroides necesita.</p>
            </div>
            <div className="estres-arrow">→</div>
            <div className="estres-card">
              <div className="estres-num">3</div>
              <strong>Retiene líquido</strong>
              <p>Sin esos nutrientes no produce T3 activa. El cuerpo guarda agua, se inflama y vive cansada… aunque su TSH salga “normal”.</p>
            </div>
          </div>

          <div className="estres-cierre">
            <div className="estres-cierre-titulo">¿Cómo la ayuda MI TIROIDES?</div>
            <ul className="estres-lista">
              <li><strong>Selenio + Zinc:</strong> reponen lo que el cortisol drena cada día.</li>
              <li><strong>L-Tirosina:</strong> la materia prima de la hormona tiroidea — esencial bajo estrés.</li>
              <li><strong>B12 + D3:</strong> reducen la fatiga adrenal y estabilizan el estado de ánimo.</li>
              <li><strong>Yodo:</strong> repone las reservas que se queman cuando vives en alerta.</li>
            </ul>
            <p className="estres-disclaimer">
              MI TIROIDES no es magia ni un diurético. Es el combustible que a su tiroides le falta para
              trabajar — el que su pastilla no trae. Va con su Eutirox, no lo reemplaza. Dele 60-90 días
              con sueño y movimiento, y nótelo usted misma.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARATIVA - tabla horizontal */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">Ya intentaste lo demás</div>
          <h2 className="h2">Ya probaste de todo. Esto es distinto.</h2>
          <p className="lead">Hizo dietas, caminó, probó el multivitamínico de la farmacia, hasta subió la dosis. Mire por qué MI TIROIDES ataca lo que las demás ni tocan.</p>

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
            En 60 días vas a estar frente al mismo espejo, con el mismo cepillo
            lleno de pelo… o no. <strong>La diferencia empieza con lo que decidas hoy.</strong>
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
                t: "Menos hinchazón",
                d: "Al reactivar la conversión hormonal, el cuerpo suelta el líquido retenido: baja la hinchazón de cara, estómago y piernas.",
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
            Su tiroides tarda en recibir, asimilar y reflejar los nutrientes en sus síntomas.
            Por eso recomendamos un <strong style={{ color: "#fff" }}>mínimo de 3 meses continuos</strong> para ver
            cambios reales en energía, hinchazón y peso.
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
              ["91%", "Notan menos hinchazón y retención de líquido tras 8 semanas"],
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
              <summary>¿Es otro de esos suplementos de TikTok?</summary>
              <p>
                No. MI TIROIDES tiene <strong>registro INVIMA</strong>, se fabrica en Colombia bajo Buenas
                Prácticas y se paga <strong>contra entrega</strong>. Si no te convence, tienes
                <strong> garantía de 30 días</strong> y te devolvemos el dinero.
              </p>
            </details>
            <details>
              <summary>¿Qué lo diferencia de un multivitamínico?</summary>
              <p>
                Un multivitamínico reparte un poco de todo. Este trae <strong>dosis específicas para la
                tiroides</strong> —selenio 200 mcg, yodo, zinc y L-tirosina— pensadas para
                <strong> activar tu hormona T3</strong>, no para “nutrir en general”.
              </p>
            </details>
            <details>
              <summary>¿Lo puedo tomar con mi Eutirox / levotiroxina?</summary>
              <p>
                Sí. <strong>Apoya, no reemplaza.</strong> Toma tu pastilla en ayunas y MI TIROIDES con el
                desayuno, para que no se interfieran. Muchas de nuestras clientas están en levotiroxina +
                MI TIROIDES. Ante cualquier duda, consulta a tu médico.
              </p>
            </details>
            <details>
              <summary>En Rappi hay suplementos de $40.000, ¿por qué este?</summary>
              <p>
                Porque no es lo mismo. Aquí pagas por una <strong>fórmula específica con dosis que sí
                sirven</strong> (yodo + selenio juntos), más el <strong>acompañamiento de Camila por
                WhatsApp</strong> y la <strong>garantía de 30 días</strong>. Un genérico barato rara vez
                trae eso.
              </p>
            </details>
            <details>
              <summary>¿Cuándo veo resultados?</summary>
              <p>
                La mayoría de clientas reporta más energía entre la 4ª y 6ª semana. Los cambios en
                hinchazón, peso y ánimo se ven con más claridad entre el 2º y 3er mes. Por eso lo
                presentamos como un tratamiento de 3 meses.
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
              reteniendo líquido</strong>, otro día amaneciendo hinchada, otro
              día con el cuerpo pesado que no la deja moverse.
              <br /><br />
              <strong style={{ color: "#1f3d2b" }}>
                $89.900 hoy &nbsp;vs&nbsp; otro mes igual a este.
              </strong>{" "}
              Esa es la decisión real.
            </p>
          </div>
        </div>
      </section>

      {/* CIERRE */}
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
                  {/* honeypot anti-bot — oculto a humanos; los bots lo llenan y quedan marcados */}
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
