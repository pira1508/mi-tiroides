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
// Landing PACIENCIA (5-oct-2026): mal genio / irritabilidad por tiroides. Ads: NO ES SU CARÁCTER (caracter) · TRES SEGUNDOS (freno).
// agua (ES AGUA NO ES USTED) · pastilla (SU PASTILLA NO TRABAJA SOLA) · secreto (EL SECRETO) · esponja (LA ESPONJA).
// 4 heroes diseñados message-match (Higgsfield nano_banana_pro, crema/verde/dorado + frasco real).
const HERO_MUJER: Record<"caracter" | "freno", { src: string; alt: string }> = {
  caracter: { src: "/img/hero-paciencia-caracter.jpg", alt: "No es su carácter: a su cerebro le falta selenio — es su tiroides" },
  freno: { src: "/img/hero-paciencia-freno.jpg", alt: "Usted no era así de mal genio: es un freno sin energía — es su tiroides" },
};

// Slides neutrales diseñados (sirven al avatar 45-55).
// Los dos primeros son antes/después de SÍNTOMA de retención (cara y anillo),
// que es justo la tesis de v6: "es agua, no grasa". Van de primeros porque
// son la prueba más fuerte del ángulo.
// 🔴 COMPLIANCE META: nunca antes/después de peso ni de cuerpo — solo síntoma.
const HERO_RESTO = [
  // UNA sola imagen con 4 personas (rejilla 2x2), un síntoma cada una.
  // Van ARREGLADAS en las dos mitades — peinadas, ropa de calle, luz de día.
  // El síntoma se muestra con props y con la mirada, nunca "recién levantada".
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
    titulo: "Lleve el frasco con usted",
    momento: "Si sales temprano",
    caption: "Cabe en la cartera. Si sale antes de desayunar, se las toma allá con un café.",
  },
  {
    src: "/img/sincara-4.webp",
    titulo: "Domingo en familia",
    momento: "Día 14",
    caption: "Empieza el cambio: respira antes de contestar, y la primera pregunta del día ya no la saca de casillas.",
  },
  {
    src: "/img/sincara-5.webp",
    titulo: "Marque su progreso",
    momento: "Día 30",
    caption: "Menos explosiones en la semana. Duerme y descansa. En su casa empiezan a notarlo antes que usted.",
  },
  {
    src: "/img/sincara-6.webp",
    titulo: "Cierre su día",
    momento: "Día 60-90",
    caption: "La memoria vuelve, el sueño descansa y la paciencia se sostiene sola. Vuelve a reconocerse.",
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
      "T4 es la hormona inactiva; T3 es la activa que da energía. La conversión depende de la enzima deiodinasa que necesita zinc. Sin zinc suficiente, su cuerpo tiene T4 pero no la puede usar.",
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
      "T3 y T4 se construyen literalmente uniendo yodo a una molécula de tirosina. Si no tiene suficiente tirosina, su tiroides no tiene los ladrillos para fabricar hormonas.",
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
  { foto: "/img/cliente-patricia.webp", nombre: "Patricia", edad: 52, ciudad: "Bogotá", texto: "Le gritaba al nieto por cualquier cosa y después me quedaba sin entender quién fue esa. Al segundo mes con MI TIROIDES volví a contestar con calma. En mi casa lo notaron antes que yo." },
  { foto: "/img/cliente-marcela.webp", nombre: "Marcela", edad: 49, ciudad: "Cali", texto: "Tomo levotiroxina hace años y aun así vivía explotando por nada. Me decían que era la menopausia. Era mi tiroides. Con MI TIROIDES, que va con mi pastilla, dejé de pelear por todo." },
  { foto: "/img/cliente-rosa.webp", nombre: "Rosa", edad: 55, ciudad: "Barranquilla", texto: "Probé valeriana, manzanilla, que me dijeran cálmese. Nada. Cuando entendí que a mi cerebro le faltaba selenio, todo cuadró. Hoy duermo y amanezco de buen genio." },
  { foto: "/img/cliente-elena.webp", nombre: "Elena", edad: 47, ciudad: "Medellín", texto: "Todo me molestaba: el ruido, las preguntas, que me hablaran. Al mes de MI TIROIDES respiro antes de contestar, y mis hijas volvieron a sentarse conmigo a conversar." },
];

const TESTI_LARGOS = [
  { foto: "/img/cliente-patricia.webp", nombre: "Patricia Gómez", rol: "Ama de casa · 52 · Bogotá", texto: "Yo no era así. Tiraba la cuchara, le gritaba al nieto y después lloraba de la culpa. Mi examen salía normal y me decían que me calmara. Con MI TIROIDES, desde la 5ª semana, dejé de explotar por nada. No fue fuerza de voluntad: fue el selenio que a mi cerebro le faltaba.", tag: "No era mi carácter" },
  { foto: "/img/cliente-marcela.webp", nombre: "Marcela Ríos", rol: "Secretaria · 49 · Cali", texto: "Llevaba años con la levotiroxina y seguía de mal genio todo el día. Mi médica me explicó que la pastilla da T4, pero que el cerebro necesita selenio para volverla T3. MI TIROIDES va con mi pastilla, no la reemplaza, y por fin en mi casa dejaron de hablarme con miedo.", tag: "Va con mi pastilla" },
  { foto: "/img/cliente-rosa.webp", nombre: "Rosa Meza", rol: "Comerciante · 55 · Barranquilla", texto: "En la tienda contestaba mal a los clientes y a mis hijos peor. Me dijeron que era la menopausia y que me tomara una aromática. Con MI TIROIDES al segundo mes me reconocí otra vez: paciente, como era antes.", tag: "Me dijeron que era la menopausia" },
  { foto: "/img/cliente-elena.webp", nombre: "Elena Valencia", rol: "Modista · 47 · Medellín", texto: "Se me olvidaban las cosas, dormía y no descansaba, y explotaba por nada. Pensaba que eran cosas aparte. Era un cerebro sin T3. Con MI TIROIDES fui recuperando la memoria, el sueño y la paciencia, en ese orden.", tag: "Memoria, sueño y paciencia" },
  { foto: "/img/cliente-diana.webp", nombre: "Diana Cárdenas", rol: "Enfermera · 51 · Bucaramanga", texto: "Yo decía que eso no servía. Mi hermana me regaló un frasco porque ya nadie me aguantaba. Al mes me di cuenta de que no había peleado con nadie en la semana. Ya voy por mi tercer frasco.", tag: "Escéptica convertida" },
  { foto: "/img/cliente-juliana.webp", nombre: "Juliana Portilla", rol: "Docente pensionada · 58 · Pasto", texto: "Después de la menopausia me volví amargada, o eso creía. Mi endocrinóloga aprobó complementar con selenio y zinc. MI TIROIDES los tiene todos en una cápsula y me devolvió la calma que tenía en el salón de clase.", tag: "Volví a ser yo" },
  { foto: "/img/cliente-lina.webp", nombre: "Lina Ospina", rol: "Auxiliar contable · 45 · Manizales", texto: "Llegaba de la oficina y con la primera pregunta de mis hijos ya estaba gritando. Mi doctora me habló de la tiroides y el selenio. Con MI TIROIDES el freno vuelve a llegar a tiempo, como dice el video. Ahora llego y pregunto cómo les fue.", tag: "El freno llega a tiempo" },
];

const ANGULOS: Record<"caracter" | "freno", { h1: string; sub: string }> = {
  caracter: {
    h1: "No es su carácter. A su cerebro le falta selenio.",
    sub: "Explota por nada, todo le molesta y ya ni usted se reconoce, aunque su examen diga que todo está bien. Su cerebro fabrica su propia T3 con una enzima hecha de selenio. Sin selenio, la sangre puede estar llena de T4 y el cerebro vacío de T3. MI TIROIDES trae el selenio, junto con zinc, yodo y L-tirosina. Va con su pastilla, no la reemplaza.",
  },
  freno: {
    h1: "Usted no era así de mal genio.",
    sub: "El nieto pregunta por tercera vez qué hay de almuerzo y usted tira la cuchara. En su cerebro, la parte de adelante frena esa alarma a tiempo, y ese freno gasta T3. Si falta selenio, al freno no le llega la T3 y la alarma gana. No es su carácter: es un freno sin energía. MI TIROIDES trae el selenio que le falta. Va con su pastilla, no la reemplaza.",
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
  const [angulo, setAngulo] = useState<"caracter" | "freno">("caracter");
  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("angle");
    if (a === "caracter" || a === "freno") {
      setAngulo(a);
      setHeroIdx(0);
    }
  }, []);
  // El primer slide siempre es el hero del ángulo activo; detrás van los neutrales.
  const [marcados, setMarcados] = useState<number[]>([]);
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
            variant: "paciencia",
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
      setError("Necesitamos su celular Colombia (10 dígitos empezando en 3).");
      return;
    }
    if (!nombre.trim() || nombre.trim().length < 3) {
      setError("Escriba su nombre completo.");
      return;
    }
    if (!direccion.trim() || direccion.trim().length < 8) {
      setError("Escriba su dirección completa.");
      return;
    }
    if (!depto || !ciudad) {
      setError("Seleccione su departamento y ciudad.");
      return;
    }
    if (!ciudadMatcheaDepto) {
      setError("La ciudad debe seleccionarse del listado del departamento. Si no aparece, escríbanos al WhatsApp.");
      return;
    }
    if (!referencia.trim() || referencia.trim().length < 5) {
      setError("Escriba el barrio y un punto de referencia para que el repartidor la encuentre.");
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
      variant: "paciencia",
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
      setError("No pudimos registrar su pedido. Intente de nuevo o escríbanos por WhatsApp.");
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
            <span key={i}>✦ Envío gratis en su primer pedido &nbsp;&nbsp; ✦ Pago contra entrega &nbsp;&nbsp;</span>
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
              <span><strong>+6.600 pedidos entregados</strong> en 511 municipios de Colombia</span>
            </div>
            <p className="v6b-sub" style={{ color: "var(--gris)", fontSize: 16, margin: "0 0 12px" }}>{ANGULOS[angulo].sub}</p>
            {/* V6B · OFERTA EN LA PRIMERA PANTALLA (3-oct-2026): escalera 1/2/3 visible,
                garantía 90 días desde la entrega, objeción de la pastilla al lado del botón. */}
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

            <button className="btn btn-block v6b-cta" onClick={openModal}>
              Pedir ahora · paga al recibir
              <span>{PLANES[cantidad].label} · ${PLANES[cantidad].precio.toLocaleString("es-CO")} · envío gratis</span>
            </button>
            <div className="hero-checks">
              <div>No paga nada hoy: paga en efectivo cuando lo recibe</div>
              <div>Envío gratis a toda Colombia · llega en 1-3 días</div>
              <div><strong>Garantía de 90 días</strong> desde el día que lo recibe</div>
              <div>Va con su pastilla, no la reemplaza</div>
              <div><strong>${Math.round(PLANES[cantidad].perDia).toLocaleString("es-CO")} al día</strong> con {PLANES[cantidad].frascos} {PLANES[cantidad].frascos === 1 ? "frasco" : "frascos"} — menos que un tinto</div>
            </div>
            <div className="badges">
              <span className="badge">Vegano</span>
              <span className="badge">Sin gluten</span>
              <span className="badge">Registro INVIMA</span>
              <span className="badge">6 nutrientes</span>
              <span className="badge" style={{ background: "#1f3d2b", color: "#fff", borderColor: "#1f3d2b" }}>
                🌿 Asistente incluido
              </span>
            </div>
            <div className="badges" style={{ marginBottom: 12 }} role="group" aria-label="¿Qué la trajo aquí?">
              {(["caracter", "freno"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setAngulo(k); setHeroIdx(0); }}
                  className="badge"
                  style={{ cursor: "pointer", ...(angulo === k ? { background: "#1f3d2b", color: "#fff", borderColor: "#1f3d2b" } : {}) }}
                >
                  {k === "caracter" ? "No es mi carácter" : "Exploto por nada"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* V2 · VIDEO DEL AD (1 min) · poster + play, sin autoplay */}
      <section className="section-tight">
        <div className="container">
          <div className="eyebrow">Mire el video · 1 minuto</div>
          <h2 className="h2" style={{ marginBottom: 14 }}>Lo que pasa en su cabeza en tres segundos</h2>
          <div className="v2-video">
            <video controls playsInline preload="none" poster="/video/paciencia-poster.jpg" onPlay={() => { window.fbq?.("trackCustom", "VideoPlay", { landing: "paciencia" }); }}>
              <source src="/video/paciencia.mp4" type="video/mp4" />
            </video>
            <p className="v2-video-nota">Es el mismo video que la trajo hasta aquí. Toque para verlo con sonido.</p>
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
              <strong style={{ color: "var(--tinta)" }}>+6.600 pedidos entregados</strong>
              <div>Pago contra entrega · Garantía 90 días</div>
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
            <div className="testi-hint">← Deslice para ver más →</div>
          </div>
        </div>
      </section>

      {/* DOLOR / TE SUENA FAMILIAR */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">¿Le suena familiar?</div>
          <h2 className="h2">Se toma su pastilla, su examen sale “normal”…<br />y aun así explota por nada y ya ni usted se reconoce</h2>
          <p style={{ textAlign: "center", color: "var(--gris)", margin: "-6px 0 14px", fontSize: 15 }}>Toque las que le pasan a usted.</p>
          <div className="dolor-grid">
            {[
              ["💥", "Explota por nada", "Tira la cuchara, grita, y un minuto después no entiende quién fue esa. Y la culpa."],
              ["😤", "Todo le molesta", "El ruido, las preguntas repetidas, que le hablen. Lo que antes ni notaba, hoy la saca de casillas."],
              ["🍵", "Le dicen “cálmese”", "La valeriana la deja dormida, la manzanilla no le hace nada, y que le digan cálmese la pone peor."],
              ["🧠", "La memoria falla", "Se le olvidan las cosas, pierde el hilo, y eso la frustra todavía más."],
              ["🌙", "El sueño no descansa", "Duerme, pero amanece como si no hubiera dormido. Y así es más fácil explotar."],
              ["🏠", "En su casa le hablan con miedo", "Sus hijos miden lo que le dicen. Usted lo nota, y le duele."],
            ].map(([emoji, t, d], k) => {
              const on = marcados.includes(k);
              return (
                <button type="button" key={t} className={`dolor-card v2-check ${on ? "on" : ""}`} aria-pressed={on}
                  onClick={() => setMarcados(on ? marcados.filter((x) => x !== k) : [...marcados, k])}>
                  <span className="v2-box">{on ? "✓" : ""}</span>
                  <div>
                    <strong>{emoji} {t}</strong>
                    <p>{d}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="v2-resultado" aria-live="polite">
            {marcados.length === 0 ? (
              <p style={{ margin: 0, color: "var(--gris)" }}>Si se identifica con al menos 2 de estos puntos, no es su carácter: es un cerebro sin T3, aunque su examen diga “normal”.</p>
            ) : marcados.length === 1 ? (
              <p style={{ margin: 0 }}><strong>1 de 6.</strong> Con una sola ya vale la pena revisar la tiroides, sobre todo si toma levotiroxina y el examen sale “normal”.</p>
            ) : (
              <>
                <p style={{ margin: "0 0 12px", fontSize: 17 }}><strong>Marcó {marcados.length} de 6.</strong> No es su carácter ni se volvió amargada: es un cerebro al que no le llega T3. El selenio es lo que le falta a ese freno.</p>
                <button className="btn" onClick={openModal}>Quiero el selenio que le falta a mi cerebro →</button>
              </>
            )}
          </div>
          <p style={{ textAlign: "center", color: "var(--gris)", maxWidth: 640, margin: "14px auto 0", fontSize: 15 }}>
            El examen mide la sangre. Nadie le está midiendo el cerebro. Su pastilla repone la hormona, pero no le da a su cerebro el selenio con el que fabrica su propia T3.
          </p>
        </div>
      </section>

      {/* V2 · PARA QUIÉN ES / NO ES (claridad = confianza) */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">Hablemos claro</div>
          <h2 className="h2">¿Es para usted?</h2>
          <div className="v2-quien">
            <div className="v2-quien-card si">
              <h3>Sí es para usted si…</h3>
              <ul>
                <li>Toma levotiroxina (o le dijeron que la tiroides está “lenta”) y aun así explota por nada.</li>
                <li>Le dijeron que es la menopausia, que se calme, que se tome una aromática.</li>
                <li>Se le olvidan las cosas, duerme y no descansa, y todo le molesta.</li>
                <li>Quiere algo que vaya con su pastilla, no que la reemplace.</li>
              </ul>
            </div>
            <div className="v2-quien-card no">
              <h3>No es para usted si…</h3>
              <ul>
                <li>Busca un calmante para hoy en la tarde: esto es un tratamiento de 90 días, no una pastilla para dormir.</li>
                <li>Su médico le mandó algo para los nervios y no quiere consultarle antes.</li>
                <li>Espera que una cápsula arregle un problema de pareja o de familia por sí sola.</li>
                <li>Está embarazada o tiene una condición renal o hepática sin consultar a su médico.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* V2 · LO QUE YA PROBÓ (invalidación honesta) */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Seamos sinceras</div>
          <h2 className="h2">Ya probó de todo. Por eso no le funcionó.</h2>
          <div className="v2-probo">
            <div><strong>La valeriana</strong> la deja dormida, pero no le lleva selenio al cerebro. Al otro día explota igual.</div>
            <div><strong>La manzanilla y la aromática</strong> calman cinco minutos. El freno sigue sin energía.</div>
            <div><strong>«Cálmese»</strong> es lo que más le dicen, y es lo que más la pone peor: nadie se calma por orden.</div>
            <div><strong>Subir la dosis de la pastilla</strong> le da más T4 de reserva, pero sin selenio el cerebro no la vuelve T3.</div>
            <div className="ok"><strong>Selenio para la desyodasa tipo 2 de su cerebro.</strong> Es la enzima con la que fabrica su propia T3. MI TIROIDES se lo lleva junto con zinc, yodo y L-tirosina, y va con su pastilla.</div>
          </div>
        </div>
      </section>

      {/* ESTRÉS → TIROIDES — gancho científico */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">Lo que pasa en su cabeza en tres segundos</div>
          <h2 className="h2">Con pastilla y todo, explota — y esta es la razón</h2>
          <p className="lead">
            Su cerebro no espera la T3 de la sangre: <strong>cerca de 8 de cada 10 la fabrica él mismo</strong>, adentro, con la T4 de su pastilla.
            Para eso usa una enzima, la <strong>desyodasa tipo 2</strong>, y esa enzima está hecha de selenio. Sin selenio, su sangre puede
            estar llena de T4 y su cerebro vacío de T3. Y el freno que para la alarma, la corteza prefrontal, gasta mucha energía:
            depende de esa T3.
          </p>

          <div className="v2-mec-img">
            <Image src="/img/paciencia-mecanismo.webp" alt="Cerebro visto de lado: la amígdala enciende la alarma y la corteza prefrontal la frena cuando le llega T3 con selenio" width={800} height={1000} />
          </div>
          <div className="estres-grid">
            <div className="estres-card">
              <div className="estres-num">1</div>
              <strong>Segundo cero: la alarma</strong>
              <p>Oye la pregunta otra vez. Una parte del cerebro, la amígdala, prende la alarma.</p>
            </div>
            <div className="estres-arrow">→</div>
            <div className="estres-card">
              <div className="estres-num">2</div>
              <strong>Segundo uno: el freno</strong>
              <p>La parte de adelante, la corteza prefrontal, frena esa alarma a tiempo… si le llega T3. Ese freno gasta mucha energía.</p>
            </div>
            <div className="estres-arrow">→</div>
            <div className="estres-card">
              <div className="estres-num">3</div>
              <strong>Segundo tres: la alarma gana</strong>
              <p>Sin selenio no hay T3 para el freno. Usted tira la cuchara, grita, y se queda sin entender quién fue esa.</p>
            </div>
          </div>

          <div className="estres-cierre">
            <div className="estres-cierre-titulo">¿Cómo la ayuda MI TIROIDES?</div>
            <ul className="estres-lista">
              <li><strong>Selenio:</strong> la desyodasa tipo 2 de su cerebro está hecha de selenio. Con él, vuelve a fabricar su propia T3.</li>
              <li><strong>Zinc:</strong> activa la conversión de T4 en T3 y trabaja junto con el selenio.</li>
              <li><strong>L-Tirosina:</strong> la materia prima de la hormona tiroidea y de la dopamina, la del ánimo.</li>
              <li><strong>B12 + D3:</strong> sostienen el sistema nervioso y el estado de ánimo, lo que el estrés drena cada día.</li>
            </ul>
            <p className="estres-disclaimer">
              MI TIROIDES no es un calmante ni una aromática. Es el combustible que a su cerebro le falta para que el freno
              llegue a tiempo. Va con su Eutirox, no lo reemplaza. Dele 60-90 días y nótelo usted misma — y que lo noten en su casa.
            </p>
          </div>
        </div>
      </section>

      {/* COMPARATIVA - tabla horizontal */}
      <section className="section section-beige">
        <div className="container">
          <div className="eyebrow">Ya intentaste lo demás</div>
          <h2 className="h2">Ya probaste de todo. Esto es distinto.</h2>
          <p className="lead">Probó la valeriana, la manzanilla, que le dijeran cálmese, hasta el multivitamínico de la farmacia. Mire por qué MI TIROIDES ataca lo que las demás ni tocan.</p>

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
            <span>Deslice la tabla para verla completa</span>
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
                  ["Garantía 90 días desde la entrega", "yes", "no", "no"],
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
            * MI TIROIDES no reemplaza su medicamento — lo complementa con los nutrientes que falta aportar.
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
            En 60 días el nieto va a volver a preguntar por tercera vez qué hay de almuerzo. <strong>La diferencia es cómo le contesta usted.</strong>
          </div>
        </div>
      </section>

      {/* FÓRMULA */}
      <section className="section section-verde" id="ingredientes">
        <div className="container">
          <div className="eyebrow">La fórmula</div>
          <h2 className="h2">6 nutrientes. 0 rellenos. Dosis a la vista.</h2>
          <p className="lead">Cada cápsula trae lo que su tiroides realmente necesita, en dosis con respaldo científico.</p>

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
          <h2 className="h2">Su ritual diario para una tiroides que rinde</h2>
          <p className="lead">2 cápsulas al día. 10 segundos. Sin sabor, sin preparación.</p>

          <div className="beneficio-grid">
            {[
              { tag: "Semanas 2-4", t: "Menos explosiones", d: "Las primeras clientas reportan respirar antes de contestar y pasar la semana sin una sola pelea." },
              { tag: "Mes 2", t: "Duerme y descansa", d: "Con la T3 llegando al cerebro, el sueño vuelve a reparar. Amanece de buen genio." },
              { tag: "Meses 2-3", t: "La memoria vuelve", d: "Deja de perder el hilo y de olvidar las cosas, y eso quita una fuente de frustración." },
              { tag: "Uso continuo", t: "Vuelve a reconocerse", d: "B12 y D3 sostienen el ánimo. La gran mayoría reporta sentirse menos irritable, y en su casa lo notan." },
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

      {/* V2 · EL DESPUÉS (foto real, sin antes/después de cuerpo) */}
      <section className="section section-beige">
        <div className="container">
          <div className="v2-despues">
            <Image src="/img/paciencia-despues.webp" alt="Abuela colombiana sirviéndole el almuerzo a su nieto, los dos riéndose en la cocina" width={800} height={1000} />
            <div>
              <div className="eyebrow">A los 90 días</div>
              <h2 className="h2" style={{ textAlign: "left" }}>Que el nieto pregunte tres veces y usted sonría</h2>
              <p style={{ color: "var(--gris)", fontSize: 16, lineHeight: 1.6 }}>No es que vaya a dejar de tener días malos. Es que el freno vuelve a llegar a tiempo, y usted vuelve a ser la que era antes.</p>
              <ul>
                <li>Respira antes de contestar, sin forzarse.</li>
                <li>Duerme y amanece descansada, de buen genio.</li>
                <li>Deja de perder el hilo y de olvidar las cosas.</li>
                <li>En su casa le vuelven a hablar sin medir las palabras.</li>
              </ul>
              <button className="btn" style={{ marginTop: 18 }} onClick={openModal}>Quiero volver a ser yo · pago al recibir</button>
            </div>
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
              ["+6.600", "pedidos entregados y pagados contra entrega desde mayo de 2026"],
              ["511", "municipios de 43 departamentos a los que ya hemos llegado"],
              ["+12.400", "frascos entregados en manos de clientas colombianas"],
              ["+700", "clientas que ya volvieron a pedir su siguiente tratamiento"],
            ].map(([n, t]) => (
              <div key={n} className="stat-card">
                <div className="stat-num">{n}</div>
                <p>{t}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "var(--gris)", marginTop: 22, fontSize: 12 }}>
            Datos de nuestro sistema de pedidos al 3 de octubre de 2026.
          </p>
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
            cambios reales en el genio, el sueño y la memoria.
          </p>
          <p style={{ color: "#d6cdb3", marginTop: 12 }}>
            Las clientas que abandonan al primer mes no ven resultados.
            <br />
            <strong style={{ color: "#fff" }}>Las que completan los 3 meses, sí.</strong>
          </p>
        </div>
      </section>

      {/* TESTIMONIOS LARGOS */}
      <section className="section section-beige" id="testimonios">
        <div className="container">
          <div className="eyebrow">Historias reales</div>
          <h2 className="h2">Historias de clientas</h2>
          <p className="lead">Mamás, abuelas y trabajadoras que volvieron a ser las de antes.</p>

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
            <div className="testi-hint">← Deslice para ver más →</div>
          </div>
        </div>
      </section>

      {/* MI TIROIDES EN TU VIDA — ritual diario con timeline */}
      <section className="section">
        <div className="container">
          <div className="eyebrow">Cómo se toma · Qué vas a sentir</div>
          <h2 className="h2">Un ritual simple, cambios reales en 90 días</h2>
          <p className="lead">
            <strong>2 cápsulas, 1 vez al día, con el desayuno.</strong> Eso es todo. Aquí le mostramos cuándo
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
            <div className="testi-hint">← Deslice para ver el recorrido completo →</div>
          </div>

          <div className="ritual-cierre">
            <strong>¿Y si me olvido un día?</strong> No pasa nada — la suplementación tiroidea funciona por
            acumulación, no por una sola dosis. Solo retome al día siguiente con su desayuno.
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
              { i: "💬", t: "Resuelva dudas cuando quiera", d: "¿Puedo tomarlo con café? ¿Y si tomo levotiroxina? Le respondemos al momento." },
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

      {/* V2 · GARANTÍA COMO PROCESO (riesgo del lado nuestro) */}
      <section className="section">
        <div className="container">
          <div className="v2-garantia">
            <h3>Garantía de 90 días desde el día que lo recibe</h3>
            <p className="v2-gsub">El riesgo lo corremos nosotros, no usted. Así funciona:</p>
            <div className="v2-pasos">
              <div className="v2-paso"><b>1. Lo recibe y lo paga</b>En efectivo, en su casa, cuando el repartidor se lo entrega. Hoy no paga nada.</div>
              <div className="v2-paso"><b>2. Lo toma 90 días</b>Los 90 días empiezan el día que lo recibe, no el día que lo pide.</div>
              <div className="v2-paso"><b>3. Si no nota el cambio, nos escribe</b>Un WhatsApp. Sin devolver el frasco, sin preguntas. Le devolvemos la plata en máximo 3 días hábiles.</div>
            </div>
            <p className="v2-gfoot">Más de 6.600 pedidos entregados en 511 municipios. Registro INVIMA. Hecho en Colombia.</p>
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
              <summary>¿Es otro de esos suplementos de TikTok?</summary>
              <p>
                No. MI TIROIDES tiene <strong>registro INVIMA</strong>, se fabrica en Colombia bajo Buenas
                Prácticas y se paga <strong>contra entrega</strong>. Si en
                <strong> 90 días desde que lo recibe</strong> no nota el cambio, le devolvemos la plata.
                Sin devolver el frasco, sin preguntas.
              </p>
            </details>
            <details>
              <summary>¿Qué lo diferencia de un multivitamínico?</summary>
              <p>
                Un multivitamínico reparte un poco de todo. Este trae <strong>dosis específicas para la
                tiroides</strong> —selenio 200 mcg, yodo, zinc y L-tirosina— pensadas para
                <strong> activar su hormona T3</strong>, no para “nutrir en general”.
              </p>
            </details>
            <details>
              <summary>¿Lo puedo tomar con mi Eutirox / levotiroxina?</summary>
              <p>
                Sí. <strong>Apoya, no reemplaza.</strong> Tome su pastilla en ayunas y MI TIROIDES con el
                desayuno, para que no se interfieran. Muchas de nuestras clientas están en levotiroxina +
                MI TIROIDES. Ante cualquier duda, consulte a su médico.
              </p>
            </details>
            <details>
              <summary>En Rappi hay suplementos de $40.000, ¿por qué este?</summary>
              <p>
                Porque no es lo mismo. Aquí paga por una <strong>fórmula específica con dosis que sí
                sirven</strong> (yodo + selenio juntos), más el <strong>acompañamiento de Camila por
                WhatsApp</strong> y la <strong>garantía de 90 días</strong>. Un genérico barato rara vez
                trae eso.
              </p>
            </details>
            <details>
              <summary>¿Es la menopausia o es la tiroides?</summary>
              <p>
                Pueden ir juntas, pero el mal genio que explota por nada, con memoria que falla y sueño que no descansa, es la
                huella de un <strong>cerebro sin T3</strong>. El cerebro fabrica cerca del 80 % de su T3 con una enzima hecha de
                selenio. Si falta selenio, el examen de sangre sale “normal” y el cerebro sigue vacío. Por eso la aromática no le
                hace nada.
              </p>
            </details>
            <details>
              <summary>¿Reemplaza la valeriana o el ansiolítico?</summary>
              <p>
                No, y no es lo mismo. La valeriana la duerme; MI TIROIDES le repone el <strong>selenio con el que su cerebro
                fabrica la T3</strong> que el freno necesita. Si su médico le formuló algo para los nervios, siga con eso y consúltele.
                Muchas clientas toman MI TIROIDES junto con su tratamiento.
              </p>
            </details>
            <details>
              <summary>¿Cuándo veo resultados?</summary>
              <p>
                La mayoría de clientas reporta menos explosiones entre la 4ª y 6ª semana. El sueño y la memoria mejoran con más
                claridad entre el 2º y 3er mes. Por eso lo presentamos como un tratamiento de 3 meses.
              </p>
            </details>
            <details>
              <summary>¿Y si mi examen sale normal?</summary>
              <p>
                El examen mide la T4 y la TSH en la sangre, no cuánta T3 fabrica su cerebro. El cerebro produce cerca del 80 % de su T3 con la desyodasa tipo 2, una enzima hecha de selenio. Sin selenio, la sangre sale “normal” y el cerebro sigue sin freno. Por eso tantas clientas con examen normal viven explotando por nada.
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
              ¿Cuánto vale otra semana gritándole a los que más quiere?
            </h2>
            <p style={{ color: "var(--tinta)", fontSize: 16, lineHeight: 1.7, margin: 0 }}>
              Lleva meses preguntándose si esto va a pasar solo. Pero a un cerebro sin selenio no le llega la T3
              por esperar. <strong>Cada día que pospone es otro día explotando por nada</strong>, otro día con la
              culpa después, otro día en que en su casa miden lo que le dicen.
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
          <h2 className="h2">¿Lista para volver a reconocerse?</h2>
          <p style={{ color: "#d6cdb3", marginBottom: 26 }}>
            Más de 6.600 pedidos entregados en 511 municipios. Usted paga cuando lo recibe.
          </p>
          <button className="btn btn-light" onClick={openModal}>
            Sí, quiero volver a ser yo →
          </button>
          <p style={{ color: "#d6cdb3", marginTop: 16, fontSize: 14, fontStyle: "italic" }}>
            Pago contra entrega · Llega en 1-3 días · Garantía de 90 días desde la entrega
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          MI TIROIDES Avanzado · Hecho en Colombia · Registro INVIMA
          <br />
          Este producto no reemplaza el tratamiento médico. Consulte a su profesional de salud.
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

      {/* V6B · BARRA PEGAJOSA (solo móvil, ver globals.css) */}
      {!modalOpen && (
        <div className="v6b-sticky">
          <div className="v6b-sticky-info">
            <strong>{PLANES[cantidad].label} · ${PLANES[cantidad].precio.toLocaleString("es-CO")}</strong>
            Paga al recibir · Garantía 90 días
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
                <span>Avanzado · Hecho en Colombia</span>
              </div>
              <div className="modal-pill">+6.600 pedidos entregados</div>
              <div className="modal-trustline">
                <span>💵 Paga al recibir</span>
                <span>🛡️ Garantía 90 días</span>
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
                🛡️ <strong>Garantía de 90 días desde el día que lo recibe.</strong>{" "}
                Si no nota el cambio, le devolvemos la plata. Y va con su pastilla, no la reemplaza.
              </div>
            </div>

            {ok && pedidoConfirmado ? (
              <div className="modal-success" style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 56, marginBottom: 6 }}>✅</div>
                <h3 style={{ margin: "0 0 8px", color: "#1f3d2b" }}>
                  ¡Pedido recibido!
                </h3>
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
                <div className="modal-section-title green">Ingrese su dirección de envío</div>
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
                    <small>A este WhatsApp enviaremos su guía de rastreo</small>
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
                        <option value="">Seleccione su departamento</option>
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
                        placeholder={depto ? "Escriba su ciudad…" : "Primero elija un departamento"}
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
                          <li>Resuelva dudas cuando quiera</li>
                          <li>
                            <strong>Precios especiales</strong> al renovar su tratamiento
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
