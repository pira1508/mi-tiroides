// Genera src/app/ecuador-ciudades-hoko.ts a partir de las listas oficiales de Hoko Ecuador.
// Uso: node scripts/gen-ciudades-hoko-ec.mjs <carpeta con cities.json y states.json>
// Los JSON se leen como datos (JSON.parse), nunca se ejecutan.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dirHoko = resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("Falta la carpeta con cities.json y states.json");
const cities = JSON.parse(readFileSync(join(dirHoko, "cities.json"), "utf8"));
const states = JSON.parse(readFileSync(join(dirHoko, "states.json"), "utf8"));

// Hoko cod → nombre de provincia que ya usa el formulario (ecuador.ts → PROVINCIAS_EC).
const PROVINCIA_FORM = {
  1: "Azuay", 2: "Bolívar", 3: "Cañar", 4: "Carchi", 5: "Cotopaxi", 6: "Chimborazo",
  7: "El Oro", 8: "Esmeraldas", 9: "Guayas", 10: "Imbabura", 11: "Loja", 12: "Los Ríos",
  13: "Manabí", 14: "Morona Santiago", 15: "Napo", 16: "Pastaza", 17: "Pichincha",
  18: "Tungurahua", 19: "Zamora Chinchipe", 20: "Galápagos", 21: "Sucumbíos", 22: "Orellana",
  23: "Santo Domingo de los Tsáchilas", 24: "Santa Elena",
};
// 25 = «Zonas No Delimitadas» (Las Golondrinas, Manga del Cura, El Piedrero): no es provincia en el formulario, se deja fuera.

// Nombres con acento que se pueden restaurar con seguridad (clave: nombre en mayúsculas sin tilde).
const ACENTOS = {
  "GIRON": "Girón", "ONA": "Oña", "SIGSIG": "Sígsig", "SIG SIG": "Sígsig", "PONCE ENRIQUEZ": "Ponce Enríquez",
  "BANOS": "Baños", "SAN MIGUEL DE BOLIVAR": "San Miguel de Bolívar", "ECHEANDIA": "Echeandía",
  "PAJAN": "Paján", "LA MANA": "La Maná", "PINAS": "Piñas", "BAHIA DE CARAQUEZ": "Bahía de Caráquez",
  "SAMBORONDON": "Samborondón", "DURAN": "Durán", "SIMON BOLIVAR": "Simón Bolívar", "JUNIN": "Junín",
  "PUERTO LOPEZ": "Puerto López", "MONTANITA": "Montañita", "LOGRONO": "Logroño", "MENDEZ": "Méndez",
  "PROANO": "Proaño", "SUCUA": "Sucúa", "QUININDE": "Quinindé", "TONCHIGUE": "Tonchigüe", "PILLARO": "Píllaro",
  "EL CORAZON": "El Corazón", "ALAQUEZ": "Aláquez", "PUJILI": "Pujilí", "SAQUISILI": "Saquisilí",
  "GONZANAMA": "Gonzanamá", "ALAUSI": "Alausí", "LICAN": "Licán", "SAN JOSE DE MORAN": "San José de Morán",
  "CAYAMBE": "Cayambe", "MEJIA": "Mejía", "CALDERON": "Calderón", "SANGOLQUI": "Sangolquí",
  "COTOCOLLAO": "Cotocollao", "MARTINEZ": "Martínez", "MONTECRISTI": "Montecristi", "OLMEDO": "Olmedo",
  "LEONIDAS PLAZA": "Leónidas Plaza", "ANGELES DEL COLON": "Ángeles del Colón", "COLON": "Colón",
  "SAN JACINTO": "San Jacinto", "RIO CHICO": "Río Chico", "RIO VERDE": "Río Verde", "BALZAR": "Balzar",
  "PEDRO CARBO": "Pedro Carbo", "SANTA LUCIA": "Santa Lucía", "ISIDRO AYORA": "Isidro Ayora",
  "TRES POSTES": "Tres Postes", "JUJAN": "Jujan", "CHONGON": "Chongón", "PUENTE LUCIA": "Puente Lucía",
  "LAS ANIMAS": "Las Ánimas", "CUMANDA": "Cumandá", "VIRGEN DE FATIMA": "Virgen de Fátima",
  "DATA DE PLAYAS": "Data de Playas", "PUCARA": "Pucará", "LA COMPANIA": "La Compañía",
  "CARCHI": "Carchi", "SAN ISIDRO (BAHIA)": "San Isidro (Bahía)", "BACHILLERO": "Bachillero",
  "CHUQUIPATA": "Chuquipata", "CHIVERIA": "Chiveria", "SAN LORENZO": "San Lorenzo", "JAMA": "Jama",
  "PUERTO ESPEJO": "Puerto Espejo", "SAN MIGUEL": "San Miguel", "HUACA": "Huaca", "PAUTE": "Paute",
  "ALAHUELA": "Alahuela", "GUAYAQUIL": "Guayaquil", "MUISNE": "Muisne", "PALORA": "Palora",
  "SANTA ANA": "Santa Ana", "CHAULLABAMBA": "Chaullabamba", "SUCRE BAHIA": "Sucre (Bahía)",
  "CHILLANES": "Chillanes", "GUANUJO": "Guanujo", "CALUMA": "Caluma", "BALAO": "Balao",
  "TONSUPA": "Tonsupa", "VICHE": "Viche", "SAME": "Same", "MUEY": "Muey", "ANCON": "Ancón",
  "CERECITA": "Cerecita", "BUCAY": "Bucay", "JARAMIJO": "Jaramijó", "CANUTO": "Canuto",
  "ESTANCILLA": "Estancilla", "SAN PABLO DE ATENAS": "San Pablo de Atenas", "SALINAS DE GUARANDA": "Salinas de Guaranda",
};

const quitarTildes = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const clave = (t) => quitarTildes(t).replace(/\s+/g, " ").trim().toUpperCase();
const MINUS_EN_MEDIO = new Set(["de", "del", "la", "las", "los", "y", "en"]);

function tituloDe(nombre) {
  const limpio = nombre.replace(/\s+/g, " ").trim();
  // Si ya tiene mayúsculas mixtas (Cuenca, Gualaceo...), se respeta tal cual.
  if (limpio !== limpio.toUpperCase() && limpio !== limpio.toLowerCase()) return limpio;
  const cla = clave(limpio);
  if (ACENTOS[cla]) return ACENTOS[cla];
  return limpio
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (i > 0 && MINUS_EN_MEDIO.has(w)) return w;
      return w.replace(/(^|[^a-záéíóúüñ])([a-záéíóúüñ])/g, (_, a, b) => a + b.toUpperCase());
    })
    .join(" ");
}

const excluidos = [];
const porProvincia = {};
for (const c of cities) {
  const provincia = PROVINCIA_FORM[c.department_id];
  if (!provincia) continue; // Zonas No Delimitadas
  const nombreOriginal = String(c.name).replace(/\s+/g, " ").trim();
  if (/inactiv/i.test(nombreOriginal) || /^santiago no$/i.test(nombreOriginal)) {
    excluidos.push(`${c.id} ${nombreOriginal} (inactiva)`);
    continue;
  }
  const nombre = tituloDe(nombreOriginal);
  const lista = (porProvincia[provincia] ??= []);
  // Duplicados (mismo nombre en la misma provincia): se queda el primero con su id.
  if (lista.some((x) => clave(x.nombre) === clave(nombre))) {
    excluidos.push(`${c.id} ${nombreOriginal} (duplicada de ${nombre})`);
    continue;
  }
  lista.push({ id: c.id, nombre });
}

// Orden alfabético dentro de cada provincia (con acentos ignorados) para el menú.
for (const k of Object.keys(porProvincia)) {
  porProvincia[k].sort((a, b) => quitarTildes(a.nombre).localeCompare(quitarTildes(b.nombre), "es"));
}

const provinciasHoko = states.filter((s) => PROVINCIA_FORM[s.cod]).map((s) => PROVINCIA_FORM[s.cod]);
const total = Object.values(porProvincia).reduce((n, l) => n + l.length, 0);

const lineas = [];
lineas.push(`// Ciudades de Hoko Ecuador por provincia (lista oficial de Hoko, generada con scripts/gen-ciudades-hoko-ec.mjs).`);
lineas.push(`// NO editar a mano: se regenera desde los JSON de Hoko. El id es el que Hoko espera (hoko_city_id).`);
lineas.push(`// Nombres: se pone mayúscula inicial y acentos conocidos; el cruce con el pedido es sin tildes ni mayúsculas.`);
lineas.push(`// ${total} ciudades en ${provinciasHoko.length} provincias.`);
lineas.push(``);
lineas.push(`export type CiudadHokoEC = { id: number; nombre: string };`);
lineas.push(``);
lineas.push(`export const CIUDADES_HOKO_EC: Record<string, CiudadHokoEC[]> = {`);
for (const prov of provinciasHoko) {
  lineas.push(`  ${JSON.stringify(prov)}: [`);
  for (const c of porProvincia[prov] || []) {
    lineas.push(`    { id: ${c.id}, nombre: ${JSON.stringify(c.nombre)} },`);
  }
  lineas.push(`  ],`);
}
lineas.push(`};`);
lineas.push(``);
lineas.push(`const sinTildeHoko = (t: string) =>`);
lineas.push(`  t.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/\\s+/g, " ").trim().toLowerCase();`);
lineas.push(``);
lineas.push(`// Devuelve el id de Hoko si el texto coincide con una ciudad de esa provincia (sin tildes ni mayúsculas).`);
lineas.push(`// Si no coincide (texto libre) devuelve null: el pedido entra igual, sin hoko_city_id.`);
lineas.push(`export function hokoCityIdEC(provincia: string, texto: string): number | null {`);
lineas.push(`  const q = sinTildeHoko(texto);`);
lineas.push(`  if (!q) return null;`);
lineas.push(`  const c = (CIUDADES_HOKO_EC[provincia] || []).find((x) => sinTildeHoko(x.nombre) === q);`);
lineas.push(`  return c ? c.id : null;`);
lineas.push(`}`);
lineas.push(``);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "ecuador-ciudades-hoko.ts");
writeFileSync(out, lineas.join("\n"));
console.log(`OK ${total} ciudades, ${provinciasHoko.length} provincias → ${out}`);
console.log(`Excluidas (${excluidos.length}):\n  ${excluidos.join("\n  ")}`);
