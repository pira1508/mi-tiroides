// Departamentos de Colombia con sus ciudades/municipios principales
// Lista compacta enfocada en ciudades con cobertura para envío contra entrega.

export const DEPARTAMENTOS: Record<string, string[]> = {
  Amazonas: ["Leticia"],
  Antioquia: [
    "Medellín", "Bello", "Itagüí", "Envigado", "Rionegro", "Apartadó",
    "Sabaneta", "La Estrella", "Copacabana", "Caldas", "Girardota", "Turbo",
  ],
  Arauca: ["Arauca", "Saravena", "Tame"],
  Atlántico: [
    "Barranquilla", "Soledad", "Malambo", "Sabanalarga", "Puerto Colombia",
    "Galapa", "Baranoa", "Sabanagrande",
  ],
  Bolívar: ["Cartagena", "Magangué", "Turbaco", "Arjona", "El Carmen de Bolívar"],
  Boyacá: ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa"],
  Caldas: ["Manizales", "Villamaría", "La Dorada", "Chinchiná", "Riosucio"],
  Caquetá: ["Florencia", "San Vicente del Caguán"],
  Casanare: ["Yopal", "Aguazul", "Villanueva"],
  Cauca: ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
  Cesar: ["Valledupar", "Aguachica", "La Jagua de Ibirico"],
  Chocó: ["Quibdó"],
  Córdoba: ["Montería", "Cereté", "Sahagún", "Lorica", "Planeta Rica"],
  Cundinamarca: [
    "Soacha", "Chía", "Zipaquirá", "Fusagasugá", "Facatativá", "Mosquera",
    "Madrid", "Funza", "Cajicá", "Sopó", "La Calera", "Girardot",
  ],
  "Distrito Capital": ["Bogotá D.C."],
  Guainía: ["Inírida"],
  Guaviare: ["San José del Guaviare"],
  Huila: ["Neiva", "Pitalito", "Garzón", "La Plata"],
  "La Guajira": ["Riohacha", "Maicao", "Uribia", "San Juan del Cesar"],
  Magdalena: ["Santa Marta", "Ciénaga", "Fundación", "El Banco"],
  Meta: ["Villavicencio", "Acacías", "Granada", "Puerto López"],
  Nariño: ["Pasto", "Ipiales", "Tumaco", "Túquerres"],
  "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Villa del Rosario", "Los Patios"],
  Putumayo: ["Mocoa", "Puerto Asís"],
  Quindío: ["Armenia", "Calarcá", "Montenegro", "Quimbaya"],
  Risaralda: ["Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia"],
  "San Andrés y Providencia": ["San Andrés"],
  Santander: [
    "Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja",
    "San Gil", "Socorro",
  ],
  Sucre: ["Sincelejo", "Corozal", "Sampués"],
  Tolima: ["Ibagué", "Espinal", "Honda", "Melgar", "Líbano"],
  "Valle del Cauca": [
    "Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago", "Buga", "Yumbo",
    "Jamundí", "Candelaria",
  ],
  Vaupés: ["Mitú"],
  Vichada: ["Puerto Carreño"],
};

export const NOMBRES_DEPARTAMENTOS = Object.keys(DEPARTAMENTOS).sort((a, b) =>
  a.localeCompare(b, "es")
);
