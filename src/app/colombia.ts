// Departamentos de Colombia con sus ciudades/municipios principales
// Lista compacta enfocada en ciudades con cobertura para envío contra entrega.

// Lista expandida 2026-06-01: agregamos Bogotá en Cundinamarca (95% de la gente
// busca Bogotá en Cundinamarca, no en Distrito Capital) + ampliamos cada depto
// para coincidir con la cobertura Envía Nacional del CRM Hoko. Antes el form
// dejaba pedidos en preliminar porque su ciudad no estaba en esta lista corta.
//
// 2026-06-09: BLOQUEO POR DEVOLUCIÓN. Quitadas ciudades con tasa de devolución
// ≥70% y ciudades sin cobertura Hoko Envíos cruzadas con whitelist TikTok.
// El depto Chocó completo queda bloqueado (cobertura Envía floja, devolución
// histórica masiva). Ver memory: analisis_devoluciones_mi_tiroides.md
export const DEPARTAMENTOS: Record<string, string[]> = {
  Amazonas: ["Leticia"],
  Antioquia: [
    "Medellín", "Bello", "Itagüí", "Envigado", "Apartadó",
    "Sabaneta", "La Estrella", "Copacabana", "Caldas", "Girardota", "Turbo",
    "Caucasia", "Barbosa", "Yarumal", "Marinilla", "El Carmen de Viboral",
    "Guarne", "Santa Fe de Antioquia", "Sonsón", "Vegachí",
    "Andes", "Yolombó", "Necoclí", "Chigorodó", "Carepa", "Frontino",
    "Amagá", "Don Matías", "Cisneros", "Betulia",
  ],
  Arauca: ["Arauca", "Saravena", "Tame", "Arauquita", "Fortul"],
  Atlántico: [
    "Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia",
    "Galapa", "Baranoa", "Sabanagrande", "Juan de Acosta", "Palmar de Varela",
    "Santo Tomás", "Polonuevo", "Suan", "Usiacurí",
  ],
  Bolívar: [
    "Cartagena", "Turbaco", "Arjona", "El Carmen de Bolívar",
    "Mompós", "San Juan Nepomuceno", "San Jacinto", "María la Baja",
    "Achí", "San Pablo", "Simití", "Santa Rosa",
  ],
  Boyacá: [
    "Tunja", "Chiquinquirá", "Paipa",
    "Moniquirá", "Garagoa", "Soatá", "Villa de Leyva", "Nobsa",
    "Tibasosa", "Samacá", "Ramiriquí", "Aquitania", "Toca",
    "Belén", "Saboyá",
  ],
  Caldas: [
    "Manizales", "Villamaría", "La Dorada", "Chinchiná", "Riosucio",
    "Anserma", "Aguadas", "Salamina", "Pensilvania", "Supía",
    "Neira", "Pácora", "Manzanares", "Aranzazu", "Filadelfia",
  ],
  Caquetá: [
    "San Vicente del Caguán", "Puerto Rico", "Belén de los Andaquíes",
    "El Doncello", "El Paujil", "La Montañita", "Morelia",
  ],
  Casanare: [
    "Yopal", "Aguazul", "Villanueva", "Paz de Ariporo", "Tauramena",
    "Monterrey", "Maní", "Trinidad", "Pore", "Hato Corozal",
  ],
  Cauca: [
    "Santander de Quilichao", "Puerto Tejada",
    "Timbío", "Cajibío", "Caloto", "Patía", "Piendamó",
    "Silvia", "Morales", "Miranda", "Corinto", "Villa Rica",
    "Suárez", "Buenos Aires", "Padilla", "Toribío", "Inzá",
    "Guachené", "Bolívar",
  ],
  Cesar: [
    "Valledupar", "La Jagua de Ibirico",
    "Codazzi", "Bosconia", "Curumaní", "Chiriguaná", "El Copey",
    "Pailitas", "San Diego", "Rio de Oro", "Pelaya", "Becerril",
    "González", "La Paz", "Manaure",
  ],
  // Chocó: depto bloqueado 2026-06-09 por devolución masiva y cobertura courier débil
  Chocó: [],
  Córdoba: [
    "Cereté", "Planeta Rica",
    "Tierralta", "Montelíbano", "Ayapel", "Puerto Libertador",
    "Chinú", "San Pelayo", "Ciénaga de Oro", "San Andrés de Sotavento",
    "Buenavista", "Pueblo Nuevo",
  ],
  // Bogotá DEBE estar acá porque el 95% de la gente busca Cundinamarca para Bogotá.
  // También lo dejamos en "Distrito Capital" por si alguien lo elige así.
  Cundinamarca: [
    "Bogotá", "Bogotá D.C.",
    "Soacha", "Chía", "Zipaquirá", "Fusagasugá", "Facatativá", "Mosquera",
    "Madrid", "Funza", "Cajicá", "Sopó", "La Calera", "Girardot",
    "Cota", "Tocancipá", "Tenjo", "Tabio", "Subachoque",
    "Sibaté", "Bojacá", "Anolaima", "El Rosal", "Pacho",
    "Ubaté", "Villeta", "La Mesa", "Anapoima", "Apulo",
    "Cáqueza", "Ricaurte", "Agua de Dios", "Tocaima",
    "Puerto Salgar", "Yacopí",
  ],
  "Distrito Capital": ["Bogotá", "Bogotá D.C."],
  Guainía: ["Inírida"],
  Guaviare: ["El Retorno", "Calamar", "Miraflores"],
  Huila: [
    "Neiva", "Pitalito", "Garzón", "La Plata",
    "Aipe", "Palermo", "Campoalegre", "Rivera", "Yaguará",
    "Gigante", "Hobo", "Tarqui", "Suaza", "Acevedo",
    "Algeciras", "Isnos", "Timaná", "Saladoblanco",
  ],
  "La Guajira": [
    "Uribia", "San Juan del Cesar",
    "Manaure", "Fonseca", "Dibulla", "Albania",
    "Hatonuevo", "Barrancas", "Distracción", "El Molino", "La Jagua del Pilar",
  ],
  Magdalena: [
    "Santa Marta", "Ciénaga", "El Banco",
    "Aracataca", "Plato", "Pivijay", "Algarrobo",
    "Zona Bananera", "Sabanas de San Ángel", "Pueblo Viejo",
    "Tenerife", "Salamina", "Cerro de San Antonio",
  ],
  Meta: [
    "Villavicencio", "Granada", "Puerto López",
    "San Martín", "Guamal", "Cumaral", "Restrepo", "Castilla la Nueva",
    "Puerto Gaitán", "Puerto Lleras", "San Carlos de Guaroa",
    "El Calvario", "Lejanías", "Mesetas",
  ],
  Nariño: [
    "Pasto", "Ipiales", "Túquerres",
    "Samaniego", "La Unión", "Sandoná", "El Charco", "Cumbal",
    "Pupiales", "Aldana", "Guachucal", "Iles", "Buesaco",
    "Tangua", "Yacuanquer", "El Tambo", "Linares",
  ],
  "Norte de Santander": [
    "Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario", "Los Patios",
    "El Zulia", "Tibú", "Ábrego", "Convención", "Chinácota",
    "Toledo", "Sardinata", "El Carmen", "Salazar", "Pamplonita",
  ],
  Putumayo: [
    "Puerto Asís", "Orito", "Valle del Guamuez",
    "Sibundoy", "Villagarzón", "San Miguel", "Puerto Caicedo",
    "Puerto Guzmán", "Colón", "Santiago",
  ],
  Quindío: [
    "Armenia", "Calarcá", "Montenegro", "Quimbaya",
    "La Tebaida", "Circasia", "Salento", "Filandia", "Pijao",
    "Génova", "Buenavista", "Córdoba",
  ],
  Risaralda: [
    "Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia",
    "Belén de Umbría", "Quinchía", "Marsella", "Mistrató",
    "Pueblo Rico", "Apía", "Balboa", "Guática", "La Celia", "Santuario",
  ],
  // San Andrés y Providencia: bloqueado 2026-06-09 — no hay couriers que entreguen
  "San Andrés y Providencia": [],
  Santander: [
    "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja",
    "San Gil", "Socorro", "Vélez", "Cimitarra",
    "Sabana de Torres", "Charalá", "Lebrija", "Puente Nacional",
    "Curití", "Aratoca", "Mogotes", "Capitanejo", "Onzaga",
  ],
  Sucre: [
    "Sincelejo", "Corozal", "Sampués",
    "Tolú", "San Marcos", "Sucre", "Coveñas", "San Onofre",
    "Los Palmitos", "Morroa", "Ovejas", "Galeras", "Majagual",
    "San Benito Abad", "Caimito", "Buenavista",
  ],
  Tolima: [
    "Ibagué", "Espinal", "Honda", "Melgar", "Líbano",
    "Mariquita", "Chaparral", "Lérida", "Purificación", "Guamo",
    "Saldaña", "Ortega", "Flandes", "Cajamarca", "Fresno",
    "Ataco", "Natagaima", "Coyaima", "Coello",
  ],
  "Valle del Cauca": [
    "Cali", "Palmira", "Buenaventura", "Cartago",
    "Jamundí", "Candelaria",
    "Sevilla", "Florida", "Pradera", "Roldanillo", "Zarzal",
    "La Unión", "Ginebra", "El Cerrito", "Restrepo", "Andalucía",
    "Bugalagrande", "San Pedro", "El Cairo", "Toro", "Versalles",
    "Calima", "Vijes", "La Cumbre", "Rozo", "Villa Gorgona",
  ],
  Vaupés: ["Mitú", "Carurú", "Taraira"],
  Vichada: ["Puerto Carreño", "La Primavera", "Cumaribo", "Santa Rosalía"],
};

export const NOMBRES_DEPARTAMENTOS = Object.keys(DEPARTAMENTOS).sort((a, b) =>
  a.localeCompare(b, "es")
);
