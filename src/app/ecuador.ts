// Provincias del Ecuador (24) con sugerencias de ciudades o cantones principales.
// La ciudad es texto libre: la lista solo ayuda a escribirla bien. La validación
// fuerte es la provincia (debe ser una de estas 24).
export const PROVINCIAS_EC: Record<string, string[]> = {
  "Azuay": ["Cuenca", "Gualaceo", "Paute", "Santa Isabel", "Sígsig", "Camilo Ponce Enríquez"],
  "Bolívar": ["Guaranda", "San Miguel", "Caluma", "Chillanes", "Echeandía"],
  "Cañar": ["Azogues", "La Troncal", "Cañar", "Biblián"],
  "Carchi": ["Tulcán", "San Gabriel", "El Ángel", "Mira"],
  "Chimborazo": ["Riobamba", "Guano", "Alausí", "Chambo", "Colta"],
  "Cotopaxi": ["Latacunga", "La Maná", "Salcedo", "Pujilí", "Saquisilí"],
  "El Oro": ["Machala", "Pasaje", "Santa Rosa", "Huaquillas", "El Guabo", "Arenillas", "Piñas", "Zaruma"],
  "Esmeraldas": ["Esmeraldas", "Quinindé", "Atacames", "San Lorenzo", "Muisne"],
  "Galápagos": ["Puerto Baquerizo Moreno", "Puerto Ayora", "Puerto Villamil"],
  "Guayas": ["Guayaquil", "Durán", "Samborondón", "Daule", "Milagro", "Nobol", "Playas", "El Triunfo", "Naranjal", "Balzar", "Yaguachi", "Salitre", "Pedro Carbo", "Naranjito"],
  "Imbabura": ["Ibarra", "Otavalo", "Cotacachi", "Atuntaqui", "Pimampiro", "Urcuquí"],
  "Loja": ["Loja", "Catamayo", "Cariamanga", "Macará", "Saraguro"],
  "Los Ríos": ["Babahoyo", "Quevedo", "Ventanas", "Vinces", "Buena Fe", "Valencia", "Montalvo", "Pueblo Viejo"],
  "Manabí": ["Portoviejo", "Manta", "Chone", "El Carmen", "Jipijapa", "Montecristi", "Bahía de Caráquez", "Pedernales", "Rocafuerte", "Calceta"],
  "Morona Santiago": ["Macas", "Sucúa", "Gualaquiza"],
  "Napo": ["Tena", "Archidona", "El Chaco"],
  "Orellana": ["Francisco de Orellana (El Coca)", "La Joya de los Sachas", "Loreto"],
  "Pastaza": ["Puyo", "Mera", "Santa Clara"],
  "Pichincha": ["Quito", "Sangolquí", "Cayambe", "Machachi", "Tabacundo", "Pedro Vicente Maldonado", "San Miguel de los Bancos", "Puerto Quito"],
  "Santa Elena": ["Santa Elena", "La Libertad", "Salinas"],
  "Santo Domingo de los Tsáchilas": ["Santo Domingo", "La Concordia"],
  "Sucumbíos": ["Nueva Loja (Lago Agrio)", "Shushufindi", "Cascales"],
  "Tungurahua": ["Ambato", "Baños de Agua Santa", "Pelileo", "Píllaro", "Cevallos"],
  "Zamora Chinchipe": ["Zamora", "Yantzaza", "Zumbi"],
};

export const NOMBRES_PROVINCIAS_EC = Object.keys(PROVINCIAS_EC);

// Celular de Ecuador: 9 dígitos que empiezan en 9. Acepta 09XXXXXXXX y +593 9XXXXXXXX.
export function sanitizarTelefonoEC(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("593")) d = d.slice(3);
  if (d.length === 10 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export function esCelularECValido(raw: string): boolean {
  return /^9\d{8}$/.test(sanitizarTelefonoEC(raw));
}

// Se muestra como 09X XXX XXXX, que es como lo escriben en Ecuador.
export function formatearTelefonoEC(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("593")) d = "0" + d.slice(3);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

// ── PRECIOS ECUADOR (USD) · CAMBIAR AQUÍ ────────────────────────────────────
// Es el único lugar donde se definen. La página los muestra, /api/pedido-ec los
// manda como `total` y el webhook del CRM (landing-mi-tiroides-ec) acepta ese total.
// Precio confirmado por Andrés (11-nov-2026): 34,90 / 49,90 / 64,90.
export const PRECIOS_EC: Record<"1" | "2" | "3", { precio: number; frascos: number; label: string }> = {
  "1": { precio: 34.9, frascos: 1, label: "1 Frasco" },
  "2": { precio: 49.9, frascos: 2, label: "2 Frascos" },
  "3": { precio: 64.9, frascos: 3, label: "3 Frascos" },
};

// Promesas que dependen de la operación de Ecuador. Si se apagan, la página
// quita esos textos sola.
export const GARANTIA_EC = true;   // «Garantía de 90 días desde la entrega» (confirmar con Andrés)
export const ASISTENTE_EC = false; // acompañamiento por WhatsApp: apagado hasta tener número +593

export const usd = (n: number) =>
  "US$" + n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// WhatsApp de Ecuador. PENDIENTE: no hay número +593 todavía.
// Mientras sea null, la página no muestra enlaces de WhatsApp (no se manda a la
// clienta al número de Colombia).
export const WHATSAPP_EC: string | null = null;
