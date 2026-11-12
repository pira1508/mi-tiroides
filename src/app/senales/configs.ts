import type { Config } from "./senales-page";

// Cuatro prelandings «Funnel 4 señales». Gloria, 54, Ibagué. Textos de CARTA.txt (ABO-IMG-MT), condensados.

export const CONFIG_HINCHAZON: Config = {
  senal: "hinchazon",
  origin: "senales-hinchada",
  h1: "Se toma su pastilla juiciosa y aun así amanece hinchada.",
  sub: "Gloria toma su levotiroxina todos los días y aun así se le hinchan la cara, las manos y los pies. No es grasa: es agua que el cuerpo retiene.",
  fotos: [
    { src: "/img/senales/hinchazon-a.webp", alt: "Gloria se mira al espejo del baño a las 6 de la mañana: la cara hinchada" },
    { src: "/img/senales/hinchazon-b.webp", alt: "Gloria a las 4 de la tarde, sin poder meter el pie en el zapato" },
    { src: "/img/senales/hinchazon-c.webp", alt: "Gloria a las 7 de la noche, en la mesa con el té y el plato sin terminar" },
  ],
  historia: [
    "Tenía 54 años y ya no le entraban los anillos. Gloria vive en Ibagué, en un tercer piso con una nevera que hace ruido. Hace un año amanece con la cara hinchada y los ojos cargados, y al final del día los zapatos le aprietan como si el pie se le hubiera crecido.",
    "Toma su pastilla de la tiroides todos los días, juiciosa, en ayunas. Su médico la controla cada seis meses y le dice que va bien. Y aun así se sentía como una esponja que nadie exprime.",
    "Probó de todo: quitó la sal de la mesa, dejó el pan, hizo la dieta del pepino que le mandó una prima y tomó té diurético todas las noches. Adelgazó un poquito la primera semana y después volvió a lo mismo.",
    "Lo que se lo explicó fue doña Nubia, la señora del tinto afuera de la plaza de mercado: «Mija, mire la esponja: usted la exprime y se queda llena, porque por dentro ya no suelta. No es que usted tome poca agua. Es que lo que la hacía soltar se le fue secando».",
  ],
  probe: [
    "Quitar la sal de la mesa",
    "La dieta del pepino y dejar el pan",
    "Té diurético de la tienda cada noche",
    "Tomar agua a rayitas en un galón, todo el día",
  ],
  recorrido: [
    { tag: "Semanas 1-2", t: "Nada especial", d: "Gloria dice que no notó nada y casi lo deja. Es lo normal: el cuerpo tarda en reponer lo que le falta." },
    { tag: "Semana 4", t: "Los zapatos ya no aprietan", d: "A media tarde los pies ya no le duelen tanto y la hinchazón de las manos empieza a bajar." },
    { tag: "Semana 8", t: "La cara se ve más descansada", d: "Compara las fotos de la primera semana y la cara se ve más descansada, la ropa vuelve a cerrar." },
  ],
  limite: "hay días en que Gloria amanece hinchada igual. Si la hinchazón es de un día para otro, en una sola pierna, o viene con dolor en el pecho o falta de aire, consulte a su médico de inmediato.",
  cierreSenal: "Si usted se inflama aunque coma poco y tome su pastilla, esta es la primera señal que hay que mirar.",
};

export const CONFIG_CANSANCIO: Config = {
  senal: "cansancio",
  origin: "senales-cansada",
  h1: "Duerme 8 horas… y aun así amanece agotada.",
  sub: "Gloria toma su pastilla juiciosa desde hace años y aun así a las 3 de la tarde se le cierran los ojos. No es pereza ni solo la edad.",
  fotos: [
    { src: "/img/senales/cansancio-a.webp", alt: "Gloria dormida en el sofá a las 3 de la tarde con la ropa del trabajo puesta" },
    { src: "/img/senales/cansancio-b.webp", alt: "Gloria con un tinto frío a las 3 de la tarde" },
    { src: "/img/senales/cansancio-c.webp", alt: "Gloria llegando a casa con el bolso y los zapatos a un lado" },
  ],
  historia: [
    "Se quedaba dormida en el sofá a las 3 de la tarde, con la ropa del trabajo puesta. Tiene 54 años, vende ropa por catálogo desde la casa en Ibagué y duerme ocho o nueve horas.",
    "Su hija le decía: «Mami, usted ya no se ríe». Toma su pastilla de la tiroides en ayunas, todos los días, y el médico dice que sus exámenes van bien. Y aun así vivía cansada.",
    "Le echó la culpa a la edad, a la menopausia y al trabajo. Se tomó tres o cuatro tintos al día: quedaba acelerada, pero igual de cansada. Compró vitaminas del frasco grande y no se notó nada.",
    "Fue la vecina de la tienda, doña Olga, quien le dio la clave: «Usted puede tener el celular conectado al cargador, pero si el enchufe está flojo, no carga. La hormona es el cargador, pero la tiroides necesita con qué trabajar».",
  ],
  probe: [
    "Tinto, tres o cuatro al día",
    "Vitaminas del frasco grande de la droguería",
    "Acostarse más temprano",
    "Un té de energía que la dejaba inquieta de noche",
  ],
  recorrido: [
    { tag: "Semanas 1-2", t: "Nada especial", d: "Gloria no sintió nada especial y casi lo deja. Es normal: el cuerpo tarda en responder." },
    { tag: "Semana 4", t: "Ya no se duerme en el sofá", d: "Una tarde llegó, hizo la comida en vez de tirarse al sofá, y su hija lo notó antes que ella." },
    { tag: "Semana 8", t: "Se siente ella otra vez", d: "Más ánimo y menos cansancio a media tarde. No es magia, pero ya no se le cierran los ojos solos." },
  ],
  limite: "hay días en que Gloria sigue cansada, como cualquiera. Si el cansancio es extremo o aparece con mareo, palpitaciones o pérdida de peso, consulte a su médico antes de seguir.",
  cierreSenal: "Si duerme y aun así se le caen los ojos a media tarde, la energía no está fallando: le faltan los nutrientes para usar lo que la pastilla le da.",
};

export const CONFIG_UNAS: Config = {
  senal: "unas",
  origin: "senales-unas",
  h1: "Se toma su pastilla juiciosa y aun así las uñas se le parten con nada.",
  sub: "Gloria lava la loza y se le parte una uña. Probó esmaltes, cremas y biotina por meses. El problema no estaba en la uña sino en lo que la alimenta.",
  fotos: [
    { src: "/img/senales/unas-a.webp", alt: "Gloria lavando la loza con espuma: las uñas partidas" },
    { src: "/img/senales/unas-b.webp", alt: "Gloria con la bolsa del mercado, las manos secas" },
    { src: "/img/senales/unas-c.webp", alt: "Gloria abriendo la cajonera del tocador" },
  ],
  historia: [
    "Lavaba la loza y se le partían las uñas. Tiene 54 años y trabaja en la papelería de la esquina en Ibagué. Hace más de un año, cada vez que mete las manos al agua caliente, se le parte una uña. Llegó a cortárselas para que no se le enredaran, y ya no le quedaba nada que cortar.",
    "Toma su pastilla de la tiroides todos los días, en ayunas. Su médico la revisa cada seis meses y dice que va bien. Y aun así las uñas se le partían.",
    "Probó esmaltes «fortalecedores», cremas para manos, aceite de almendras cada noche y biotina en cápsulas por meses. Pensó que era el lavado de la casa, la edad o el clima. Nada le cambiaba la uña.",
    "La manicurista de la cuadra, doña Ligia, lo vio en un minuto: «Mija, la uña es como la madera de la casa: se raja cuando por dentro se está secando. Usted le pone barniz por fuera, pero el barniz no alimenta».",
  ],
  probe: [
    "Esmaltes «fortalecedores» que prometen uñas de acero",
    "Cremas para manos y aceite de almendras cada noche",
    "Biotina en cápsulas por meses",
    "Cortarlas para que no se enreden",
  ],
  recorrido: [
    { tag: "Semanas 1-2", t: "Nada especial", d: "No vio nada y casi lo deja. Las uñas crecen despacio, así que el cambio tarda." },
    { tag: "Semana 4", t: "La uña nueva sale más firme", d: "Aunque la vieja siga partida, la uña que empieza a salir se ve más firme." },
    { tag: "Semana 8", t: "La uña nueva ya se ve distinta", d: "La compara con la primera foto y la uña nueva crece con otra fuerza." },
  ],
  limite: "la uña crece unos milímetros al mes, así que el cambio tarda. Hay días en que a Gloria se le parte una igual, y se lo contamos para que no se desanime. Si además se le caen uñas o cambian de color, consulte a su médico.",
  cierreSenal: "Si sus uñas se parten con cualquier cosa y ningún esmalte ni crema las cambia, el problema está dentro de la uña, no fuera.",
};

export const CONFIG_PELO: Config = {
  senal: "pelo",
  origin: "senales-pelo",
  h1: "Se toma su pastilla juiciosa y aun así se le cae el pelo a mechones.",
  sub: "Gloria encuentra mechones en el cepillo, en la almohada y en el desagüe de la ducha. El champú no era el problema: la raíz no tenía con qué.",
  fotos: [
    { src: "/img/senales/pelo-a.webp", alt: "Gloria con el cepillo en el tocador y mechones de pelo" },
    { src: "/img/senales/pelo-b.webp", alt: "Gloria mirando el desagüe de la ducha con pelo atascado" },
    { src: "/img/senales/pelo-c.webp", alt: "Gloria haciéndose la trenza en la silla" },
  ],
  historia: [
    "Encontraba pelo en el cepillo cada mañana. Tiene 54 años, lleva más de treinta años peinándose con la misma trenza, y ahora la trenza ya no tiene el mismo cuerpo.",
    "Toma su pastilla de la tiroides todos los días, en ayunas. Su médico la controla y le dice que va bien. Y aun así se le caía el pelo.",
    "Probó un champú para la caída que costaba una fortuna, tratamientos en la peluquería, aceite de ricino cada noche, biotina por meses y un suero de «raíz fuerte». Se cortaba el pelo para que se viera más grueso. Nada detenía la caída.",
    "La peluquera de toda la vida, doña Lucila, se lo explicó mientras le hacía la trenza: «Mija, el champú limpia, pero el pelo se alimenta por dentro. Cuando la raíz no tiene con qué, el pelo se cae como la hoja seca del árbol en verano. Usted le echa crema a la hoja, pero la hoja ya se secó desde el tronco».",
  ],
  probe: [
    "Champú especial para la caída",
    "Tratamientos en la peluquería",
    "Aceite de ricino cada noche",
    "Biotina y un suero de «raíz fuerte»",
  ],
  recorrido: [
    { tag: "Semanas 1-2", t: "Sigue viendo pelo en el cepillo", d: "Es normal: el pelo tarda en responder. Nada cambia todavía." },
    { tag: "Semana 4", t: "Se caen menos mechones", d: "En la ducha y en la almohada aparecen menos mechones que antes." },
    { tag: "Semana 8", t: "La trenza vuelve a tener cuerpo", d: "Al hacerse la trenza otra vez, tiene más cuerpo que hace dos meses." },
  ],
  limite: "el pelo crece unos centímetros al mes, así que el cambio tarda en verse. Si la caída es fuerte o de un día para otro, consulte a su médico antes de seguir.",
  cierreSenal: "Si el pelo se le cae aunque tenga buen champú y se cuide, la raíz está pidiendo nutrientes que la pastilla sola no trae.",
};
