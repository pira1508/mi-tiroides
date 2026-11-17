// Genera src/app/ecuador-ciudades-hoko.ts y src/app/ecuador-parroquias-hoko.ts.
// Uso: node scripts/gen-ciudades-hoko-ec.mjs
// Lee como DATOS (JSON.parse, nunca se ejecutan):
//   scripts/data/cobertura-ec.json       → 586 ciudades de Hoko Ecuador con las transportadoras que cotizan
//                                          hoy (id, name, prov, cour). Solo salen las que tienen cobertura (cour no vacío).
//   scripts/data/dpa-parroquias-ec.json  → parroquias, cantones y provincias oficiales (DPA, INEC/CONALI).
//                                          Fuente: capa Parroquias_del_Ecuador, servicio ArcGIS services7.arcgis.com/iFGeGXTAJXnjq0YN.
// Las parroquias que no son ciudad de Hoko se mapean a la ciudad de Hoko de su cantón, solo si esa ciudad tiene cobertura.
// NO editar a mano los .ts generados.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const cobertura = JSON.parse(readFileSync(resolve(aqui, "data", "cobertura-ec.json"), "utf8"));
const dpa = JSON.parse(readFileSync(resolve(aqui, "data", "dpa-parroquias-ec.json"), "utf8")).registros;
const SRC = join(aqui, "..", "src", "app");

// Nombres de provincia del formulario (ecuador.ts → PROVINCIAS_EC).
const PROVINCIAS_FORM = [
  "Azuay", "Bolívar", "Cañar", "Carchi", "Cotopaxi", "Chimborazo", "El Oro", "Esmeraldas", "Guayas", "Imbabura",
  "Loja", "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Pastaza", "Pichincha", "Tungurahua", "Zamora Chinchipe",
  "Galápagos", "Sucumbíos", "Orellana", "Santo Domingo de los Tsáchilas", "Santa Elena",
];

// Nombres con acento que se restauran al generar (clave: nombre en mayúsculas sin tilde).
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
  "SAN ISIDRO (BAHIA)": "San Isidro (Bahía)", "BACHILLERO": "Bachillero",
  "CHUQUIPATA": "Chuquipata", "CHIVERIA": "Chiveria", "PUERTO ESPEJO": "Puerto Espejo", "ALAHUELA": "Alahuela",
  "SUCRE BAHIA": "Sucre (Bahía)", "CHILLANES": "Chillanes", "GUANUJO": "Guanujo", "CALUMA": "Caluma",
  "TONSUPA": "Tonsupa", "VICHE": "Viche", "SAME": "Same", "MUEY": "Muey", "ANCON": "Ancón",
  "CERECITA": "Cerecita", "BUCAY": "Bucay", "JARAMIJO": "Jaramijó", "CANUTO": "Canuto",
  "ESTANCILLA": "Estancilla", "SAN PABLO DE ATENAS": "San Pablo de Atenas", "SALINAS DE GUARANDA": "Salinas de Guaranda",
  "SAN PEDRO DE GUANUJO": "San Pedro de Guanujo", "PELILEO": "Pelileo", "GUAPAN": "Guapán", "BIBLIAN": "Biblián",
};

// Canton DPA → nombre en Hoko cuando no coincide tal cual (clave y valor normalizados con n()).
// Además de esto, se prueba «<canton> <provincia>» (p. ej. OLMEDO LOJA / OLMEDO MANABI).
const ALIAS_CANTON = {
  "SAN PEDRO DE PELILEO": "PELILEO", "SANTIAGO DE PILLARO": "PILLARO", "BANOS DE AGUA SANTA": "BANOS",
  "SAN PEDRO DE HUACA": "HUACA", "SAN MIGUEL": "SAN MIGUEL DE BOLIVAR", "EMPALME": "EL EMPALME",
  "EL TAMBO": "TAMBO", "GUANO": "EL GUANO", "RIOVERDE": "RIO VERDE", "CAMILO PONCE ENRIQUEZ": "PONCE ENRIQUEZ",
  "PUEBLOVIEJO": "PUEBLO VIEJO", "LA JOYA DE LOS SACHAS": "JOYA DE LOS SACHAS", "CRNEL MARCELINO MARIDUENA": "MARCELINO MARIDUENA",
  "GNRAL ANTONIO ELIZALDE": "GENERAL ANTONIO ELIZALDE", "SAN JACINTO DE YAGUACHI": "YAGUACHI", "PAQUISHA": "PAQUIZHA",
  "RUMIÑAHUI": "RUMINAHUI", "LOGROÑO": "LOGRONO",
};

// n(): comparación sin tildes, sin mayúsculas, sin signos. «Ð» en el DPA es una «Ñ» mal codificada.
const n = (t) => String(t ?? "").replace(/Ð/g, "Ñ").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const quitarTildes = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const MINUS_EN_MEDIO = new Set(["de", "del", "la", "las", "los", "y", "en"]);

function tituloDe(nombre) {
  const limpio = String(nombre).replace(/\s+/g, " ").trim();
  if (limpio !== limpio.toUpperCase() && limpio !== limpio.toLowerCase()) return limpio;
  const cla = n(limpio);
  if (ACENTOS[cla]) return ACENTOS[cla];
  return limpio.toLowerCase().split(" ").map((w, i) => {
    if (i > 0 && MINUS_EN_MEDIO.has(w)) return w;
    return w.replace(/(^|[^a-záéíóúüñ])([a-záéíóúüñ])/g, (_, a, b) => a + b.toUpperCase());
  }).join(" ");
}

// Provincia de Hoko («Manabi», «Santo Domingo», «Zamora») o del DPA → nombre del formulario, o null (zonas).
function provForm(raw) {
  const t = n(raw);
  if (!t || t.startsWith("ZONA")) return null;
  return PROVINCIAS_FORM.find((f) => n(f) === t) ?? PROVINCIAS_FORM.find((f) => n(f).startsWith(t) || t.startsWith(n(f))) ?? null;
}

// ── Ciudades de Hoko con cobertura ──────────────────────────────────────────
const inactiva = (c) => /inactiv/i.test(c.name) || /^santiago no$/i.test(String(c.name).trim());
const ciudadesCon = []; // {id, nombre, prov (form), cour}
for (const c of cobertura) {
  const prov = provForm(c.prov);
  if (!prov || inactiva(c) || !c.cour?.length) continue;
  ciudadesCon.push({ id: c.id, nombre: tituloDe(String(c.name).replace(/\s+/g, " ").trim()), prov, cour: c.cour });
}
const porProvincia = {};
const excluidas = [];
for (const c of ciudadesCon) {
  const lista = (porProvincia[c.prov] ??= []);
  if (lista.some((x) => n(x.nombre) === n(c.nombre))) { excluidas.push(`${c.id} ${c.nombre} (duplicada)`); continue; }
  lista.push({ id: c.id, nombre: c.nombre });
}
for (const k of Object.keys(porProvincia)) porProvincia[k].sort((a, b) => quitarTildes(a.nombre).localeCompare(quitarTildes(b.nombre), "es"));
const totalCiudades = Object.values(porProvincia).reduce((s, l) => s + l.length, 0);

// ── Parroquias → ciudad de Hoko de su cantón (solo si tiene cobertura) ───────
// Ciudad de Hoko del cantón: primero por nombre dentro de la provincia (nombre, alias, «cantón provincia»); cubiertas primero.
const ciudadesTodas = cobertura.map((c) => ({ ...c, form: provForm(c.prov), cubierta: !!c.cour?.length })).filter((c) => c.form && !inactiva(c));
function ciudadDeCanton(canton, provincia) {
  const base = n(canton);
  const candidatos = [base, ALIAS_CANTON[base], `${base} ${n(provincia)}`, ALIAS_CANTON[base] && `${ALIAS_CANTON[base]} ${n(provincia)}`].filter(Boolean);
  const enProv = ciudadesTodas.filter((c) => c.form === provincia);
  for (const nom of candidatos) {
    const m = enProv.filter((c) => n(c.name) === nom).sort((a, b) => Number(b.cubierta) - Number(a.cubierta));
    if (m.length) return m[0];
  }
  return null;
}
const cantonesMapa = new Map(); // cod_canton → {canton, prov, ciudad|null}
for (const r of dpa) {
  const prov = provForm(r.provincia);
  if (!prov) continue;
  if (!cantonesMapa.has(r.cod_canton)) cantonesMapa.set(r.cod_canton, { canton: r.canton, prov, ciudad: ciudadDeCanton(r.canton, prov) });
}
const cantonesSinCiudad = [...cantonesMapa.values()].filter((c) => !c.ciudad).length;

const parroquias = {}; // provincia → [{nombre, ciudad(Hoko), id}]
let parroquiasMapeadas = 0;
const dedupe = new Set();
for (const r of dpa) {
  const cm = cantonesMapa.get(r.cod_canton);
  if (!cm || !cm.ciudad || !cm.ciudad.cubierta) continue; // solo cantones cuya ciudad de Hoko tiene cobertura
  const nombre = tituloDe(r.parroquia);
  if (n(nombre) === n(cm.ciudad.name)) continue; // la cabecera cantonal ya es la ciudad
  // Si el nombre ya es una ciudad cubierta de esa provincia, se elige desde la lista de ciudades.
  if ((porProvincia[cm.prov] || []).some((x) => n(x.nombre) === n(nombre))) continue;
  const clave = `${cm.prov}|${n(r.parroquia)}|${cm.ciudad.id}`;
  if (dedupe.has(clave)) continue;
  dedupe.add(clave);
  (parroquias[cm.prov] ??= []).push({ nombre, canton: tituloDe(cm.ciudad.name), id: cm.ciudad.id });
  parroquiasMapeadas++;
}
for (const k of Object.keys(parroquias)) parroquias[k].sort((a, b) => quitarTildes(a.nombre).localeCompare(quitarTildes(b.nombre), "es"));

// ── Escritura: ciudades ──────────────────────────────────────────────────────
const cab = [
  `// Ciudades de Hoko Ecuador CON COBERTURA por provincia (generado por scripts/gen-ciudades-hoko-ec.mjs).`,
  `// NO editar a mano: se regenera desde scripts/data/cobertura-ec.json (cotización en vivo de Hoko, COD).`,
  `// El id es el que Hoko espera (hoko_city_id). Ciudades de Hoko sin ninguna transportadora no salen en el menú.`,
  `// Si la ciudad que escribe la clienta no está aquí, el pedido entra igual (sin hoko_city_id) y le confirmamos por WhatsApp.`,
  `// ${totalCiudades} ciudades con cobertura en ${Object.keys(porProvincia).length} provincias.`,
  ``,
  `export type CiudadHokoEC = { id: number; nombre: string };`,
  ``,
  `export const CIUDADES_HOKO_EC: Record<string, CiudadHokoEC[]> = {`,
];
for (const prov of PROVINCIAS_FORM) {
  if (!porProvincia[prov]) continue;
  cab.push(`  ${JSON.stringify(prov)}: [`);
  for (const c of porProvincia[prov]) cab.push(`    { id: ${c.id}, nombre: ${JSON.stringify(c.nombre)} },`);
  cab.push(`  ],`);
}
cab.push(`};`, ``,
  `const sinTildeHoko = (t: string) =>`,
  `  t.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/\\s+/g, " ").trim().toLowerCase();`,
  ``,
  `// Devuelve el id de Hoko si el texto coincide con una ciudad con cobertura de esa provincia (sin tildes ni mayúsculas).`,
  `// Si no coincide (texto libre) devuelve null: el pedido entra igual, sin hoko_city_id.`,
  `export function hokoCityIdEC(provincia: string, texto: string): number | null {`,
  `  const q = sinTildeHoko(texto);`,
  `  if (!q) return null;`,
  `  const c = (CIUDADES_HOKO_EC[provincia] || []).find((x) => sinTildeHoko(x.nombre) === q);`,
  `  return c ? c.id : null;`,
  `}`, ``);
writeFileSync(join(SRC, "ecuador-ciudades-hoko.ts"), cab.join("\n"));

// ── Escritura: parroquias ────────────────────────────────────────────────────
const pab = [
  `// Parroquias del Ecuador → ciudad de Hoko de su cantón, SOLO si esa ciudad tiene cobertura (generado por`,
  `// scripts/gen-ciudades-hoko-ec.mjs). NO editar a mano.`,
  `// Fuente: INEC/CONALI, Clasificador Geográfico Estadístico (DPA), capa Parroquias_del_Ecuador,`,
  `// servicio ArcGIS services7.arcgis.com/iFGeGXTAJXnjq0YN (copia en scripts/data/dpa-parroquias-ec.json).`,
  `// Se excluyen las cabeceras cantonales y los nombres que ya son ciudad de Hoko con cobertura en la provincia.`,
  `// ${parroquiasMapeadas} parroquias en ${Object.keys(parroquias).length} provincias.`,
  ``,
  `export type ParroquiaHokoEC = { nombre: string; canton: string; id: number };`,
  ``,
  `export const PARROQUIAS_HOKO_EC: Record<string, ParroquiaHokoEC[]> = {`,
];
for (const prov of PROVINCIAS_FORM) {
  if (!parroquias[prov]) continue;
  pab.push(`  ${JSON.stringify(prov)}: [`);
  for (const p of parroquias[prov]) pab.push(`    { nombre: ${JSON.stringify(p.nombre)}, canton: ${JSON.stringify(p.canton)}, id: ${p.id} },`);
  pab.push(`  ],`);
}
pab.push(`};`, ``,
  `const normP = (t: string) => t.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\\s+/g, " ").trim().toLowerCase();`,
  ``,
  `// Parroquias de la provincia que empiezan por el texto (para el menú) o que coinciden exactamente.`,
  `export function parroquiasHokoEC(provincia: string, texto: string): ParroquiaHokoEC[] {`,
  `  const q = normP(texto);`,
  `  if (q.length < 2) return [];`,
  `  return (PARROQUIAS_HOKO_EC[provincia] || []).filter((p) => normP(p.nombre).startsWith(q) || normP(p.nombre).split(" ").includes(q));`,
  `}`, ``);
writeFileSync(join(SRC, "ecuador-parroquias-hoko.ts"), pab.join("\n"));

console.log(`OK ${totalCiudades} ciudades con cobertura en ${Object.keys(porProvincia).length} provincias`);
console.log(`OK ${parroquiasMapeadas} parroquias mapeadas a ciudad con cobertura (cantones sin ciudad de Hoko: ${cantonesSinCiudad})`);
console.log(`Excluidas: ${excluidas.join("; ") || "ninguna"}`);
