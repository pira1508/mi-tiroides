// Contenido de las prelandings «Funnel 4 señales» tal como las diseñó Jean (artifact FC9R6AJACwtYdUczqcUTdM,
// exportado en ZIP el 12-nov-2026). Listicle en voz de Gloria, 54, Ibagué. Las 4 páginas comparten el texto;
// cambian el kicker, el subtítulo y el orden de las señales (la del ángulo va primero y su foto sube al inicio).
// Único cambio de Andrés: «Historia dramatizada» → «Historia ilustrativa» (la palabra «dramatización» está prohibida).
// Oferta, formulario, píxeles y /api/pedido siguen siendo los de senales-page.tsx (idénticos a v6b).
"use client";

import Image from "next/image";
import "./senales-jean.css";

type SenalId = "hinchazon" | "cansancio" | "unas" | "pelo";

const IMG = "/img/senales-jean";

const SENALES: Record<SenalId, {
  titulo: string;
  foto: { src: string; alt: string };
  texto: string[];
  burbuja: string;
}> = {
  hinchazon: {
    titulo: "Amanece con la cara y los párpados hinchados, y el anillo le aprieta",
    foto: { src: `${IMG}/senal-hinchada.jpg`, alt: "Mujer de 54 años frente al espejo del baño, con la cara y los párpados hinchados al despertar" },
    texto: [
      "No es que haya engordado de un día para otro. Cuando la tiroides va lenta, el cuerpo tiende a guardar líquido, y por eso la hinchazón se nota más al despertar: en la cara, en los párpados, en los dedos, en los tobillos.",
      "Yo dejé la sal. Tomé más agua. Hice dieta. Y seguía amaneciendo igual. No era la sal y no era lo que comía.",
    ],
    burbuja: "Yo vivo muy hinchada. Hago dietas y sigo igual de hinchada.",
  },
  cansancio: {
    titulo: "Duerme toda la noche y amanece como si no hubiera dormido",
    foto: { src: `${IMG}/senal-cansada.jpg`, alt: "Mujer sentada en el borde de la cama a las 6 de la mañana, frotándose los ojos, agotada" },
    texto: [
      "No es flojera ni es la edad. La tiroides marca el ritmo con el que el cuerpo gasta energía. Cuando va lenta, todo va lento: se levanta pesada, a media mañana ya no puede y a las 3 de la tarde necesita acostarse.",
      "Mi hija me decía que me veía apagada. Yo le decía que estaba bien. No estaba bien.",
    ],
    burbuja: "Es que yo mantengo con mucho sueño y cansada. Vivir agotada, con sueño, sin concentración, es difícil.",
  },
  pelo: {
    titulo: "El pelo en la almohada, en el desagüe y en el cepillo",
    foto: { src: `${IMG}/senal-pelo.jpg`, alt: "Mano de mujer sosteniendo un cepillo lleno de pelo sobre el lavamanos" },
    texto: [
      "La caída del cabello es de las señales más comunes de la tiroides lenta, y de las que más asustan. Yo cambié de champú tres veces, compré biotina, me eché romero. El pelo seguía saliendo a mechones.",
      "Lo que nadie me explicó es que el pelo es de lo primero que el cuerpo deja de lado cuando le faltan nutrientes: los guarda para lo más importante.",
    ],
    burbuja: "He utilizado cantidades de tratamientos para la caída del cabello y con ninguno he podido.",
  },
  unas: {
    titulo: "Uñas que se parten, se abren en capas y no crecen",
    foto: { src: `${IMG}/senal-unas.jpg`, alt: "Manos de mujer madura sosteniendo un pocillo de tinto, con las uñas débiles y descamadas" },
    texto: [
      "Esta casi nadie la relaciona con la tiroides. Las uñas débiles, que se descaman y se quiebran con nada, suelen ir de la mano con la piel reseca y con la tiroides lenta.",
      "Yo pensaba que era el jabón de lavar la loza. Me ponía guantes, me echaba crema. Y las uñas seguían igual.",
    ],
    burbuja: "Se me está cayendo mucho el cabello y las uñas también muy débiles, debido a lo de la tiroides.",
  },
};

// Kicker, subtítulo y orden de cada página, copiados de las 4 páginas de Jean.
const PAGINAS: Record<SenalId, { kicker: string; sub: string; orden: SenalId[] }> = {
  hinchazon: {
    kicker: "Se toma su pastilla juiciosa y aun así amanece hinchada.",
    sub: "La cara hinchada al despertar, el cansancio, el pelo en el cepillo y las uñas que se parten. No son 4 problemas. Es uno.",
    orden: ["hinchazon", "cansancio", "pelo", "unas"],
  },
  pelo: {
    kicker: "Se toma su pastilla juiciosa y aun así se le cae el pelo a mechones.",
    sub: "El pelo en el cepillo, las uñas que se parten, el cansancio y la hinchazón al despertar. No son 4 problemas. Es uno.",
    orden: ["pelo", "unas", "cansancio", "hinchazon"],
  },
  cansancio: {
    kicker: "Duerme 8 horas, se toma su pastilla juiciosa y aun así amanece agotada.",
    sub: "El cansancio, la cara hinchada al despertar, el pelo en el cepillo y las uñas que se parten. No son 4 problemas. Es uno.",
    orden: ["cansancio", "hinchazon", "pelo", "unas"],
  },
  unas: {
    kicker: "Se toma su pastilla juiciosa y aun así las uñas se le parten con nada.",
    sub: "Las uñas que se parten, el pelo en el cepillo, el cansancio y la hinchazón al despertar. No son 4 problemas. Es uno.",
    orden: ["unas", "pelo", "cansancio", "hinchazon"],
  },
};

const AVISO = "Historia ilustrativa, construida con mensajes reales de clientas de Mi Tiroides.";

const CHAT = [
  "Antes de tomarme Mi Tiroides amanecía con los ojos hinchados, y desde que me la estoy tomando ya no siento eso cuando despierto.",
  "Estoy muy juiciosa. La verdad me he sentido con menos cansancio y me siento menos inflamada.",
  "Más energía en el día, menos caída del cabello, menos inflamación en la cara.",
  "Se me ha desinflamado el estómago bastante. Sí son excelentes, quiero comprar otras 2.",
  "He descansado mejor y me siento con más energía.",
  "Me siento mejor, menos cansancio, y creería que la caída del cabello también ha mejorado.",
];

const NUTRI = [
  ["Selenio", "200 mcg"],
  ["Yodo", "150 mcg"],
  ["Zinc", "15 mg"],
  ["L-tirosina", "500 mg"],
  ["Vitamina B12", "500 mcg"],
  ["Vitamina D3", "2.000 UI"],
];

const FAQ: [string, string][] = [
  ["¿Lo puedo tomar con mi pastilla de la tiroides?", "Sí. No la reemplaza: la acompaña. Tómese la pastilla como siempre, en ayunas y solo con agua, y Mi Tiroides con el desayuno, unos 30 minutos después."],
  ["¿Tiene registro INVIMA?", "Sí. Mi Tiroides Avanzado tiene registro INVIMA y se fabrica en Colombia."],
  ["¿Me sirve si me operaron y no tengo tiroides?", "Es un producto natural que aporta nutrientes; no reemplaza su medicamento. Muchas clientas operadas lo toman junto con su pastilla. Si tiene dudas, escríbanos por WhatsApp y le contamos."],
  ["¿Cómo pago?", "No paga nada ahora. Le llega a la casa y paga en efectivo cuando lo recibe. El envío es gratis."],
  ["¿Y si no noto el cambio?", "Tiene garantía de 90 días desde el día que lo recibe."],
];

export function JeanContenido({
  senal,
  openModal,
  oferta,
  planLabel,
  planPrecio,
}: {
  senal: SenalId;
  openModal: () => void;
  oferta: React.ReactNode; // selector 1/2/3 frascos (OfertaOpciones de senales-page)
  planLabel: string;
  planPrecio: number;
}) {
  const pagina = PAGINAS[senal];
  const primera = SENALES[pagina.orden[0]];
  const precio = `$${planPrecio.toLocaleString("es-CO")}`;
  const irAOferta = () => document.getElementById("oferta")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="sn-cinta">
        <span>Pago contra entrega</span>
        <span>Envío gratis a toda Colombia</span>
      </div>
      <main className="sn">
        <header className="sn-head">
          <div className="sn-etiqueta">Historia de una clienta · lectura de 3 minutos</div>
          <p className="sn-kicker">{pagina.kicker}</p>
          <h1 className="sn-h1">4 señales de que a su tiroides le falta algo que la pastilla no trae</h1>
          <p className="sn-sub">{pagina.sub}</p>
          <div className="sn-firma">
            <Image src={`${IMG}/narradora-mini.jpg`} alt="Foto de Gloria" width={56} height={75} className="sn-firma-foto" />
            <div>
              <strong>Por Gloria</strong>
              <span>54 años · Ibagué · hipotiroidismo desde 2016</span>
              <em>{AVISO}</em>
            </div>
          </div>
        </header>

        <section className="sn-texto">
          <p>Me diagnosticaron hipotiroidismo hace nueve años. Desde entonces me tomo la pastilla todos los días, en ayunas, juiciosa. Los exámenes salen bien y el médico me dice que todo está normal.</p>
          <p>Pero yo no me sentía normal. Amanecía hinchada, me levantaba cansada después de dormir toda la noche, el pelo me quedaba en el cepillo y las uñas se me partían con nada.</p>
        </section>
        <figure className="sn-fig">
          <Image src={primera.foto.src} alt={primera.foto.alt} width={900} height={1200} priority />
        </figure>
        <section className="sn-texto">
          <p>Pensé que era la edad. Pensé que era yo. Hasta que una vecina, que también es tiroidea, me explicó algo que nadie me había dicho: la pastilla le pone al cuerpo la hormona, pero la tiroides necesita otras cosas para hacer su trabajo.</p>
          <p className="sn-destacado">Si a usted le pasan 2 o más de estas 4 cosas, léame hasta el final.</p>
        </section>

        {pagina.orden.map((id, i) => {
          const s = SENALES[id];
          return (
            <section className="sn-senal" key={id}>
              <div className="sn-num" aria-hidden="true">{i + 1}</div>
              <h2 className="sn-h2">
                <span className="sn-h2-pre">Señal {i + 1}.</span> {s.titulo}
              </h2>
              {i > 0 && (
                <figure className="sn-fig">
                  <Image src={s.foto.src} alt={s.foto.alt} width={900} height={1200} />
                </figure>
              )}
              <div className="sn-texto">
                {s.texto.map((p) => <p key={p}>{p}</p>)}
              </div>
              <blockquote className="sn-burbuja">
                <p>«{s.burbuja}»</p>
                <cite>Mensaje real de una clienta por WhatsApp</cite>
              </blockquote>
              {i === 1 && (
                <div className="sn-pausa">
                  <p><strong>¿Ya se identificó con 2?</strong> Siga leyendo: más abajo le cuento qué hice yo.</p>
                  <button type="button" className="sn-link" onClick={irAOferta}>O vaya directo al tratamiento y el precio ↓</button>
                </div>
              )}
            </section>
          );
        })}

        <section className="sn-caja sn-caja-verde">
          <h2 className="sn-h2">No son 4 problemas. Es uno.</h2>
          <div className="sn-texto">
            <p>Hinchazón, cansancio, pelo y uñas. Durante años yo los traté por separado: dieta para la hinchazón, tinto para el cansancio, champú para el pelo, esmalte para las uñas. Gasté plata en todo.</p>
            <p>Pero las cuatro cosas tienen el mismo origen: una tiroides que va lenta y no tiene con qué trabajar.</p>
          </div>
        </section>

        <section className="sn-bloque">
          <h2 className="sn-h2">Por qué la pastilla sola no alcanza</h2>
          <div className="sn-texto">
            <p>La pastilla (levotiroxina, Eutirox) le da al cuerpo la hormona que la tiroides no alcanza a fabricar. Es necesaria, y no hay que dejarla.</p>
            <p>Pero la tiroides, para fabricar y aprovechar esa hormona, necesita nutrientes: selenio, yodo, zinc, L-tirosina, vitamina B12 y vitamina D3. Esos no vienen en la pastilla, y en muchas mujeres están bajos.</p>
          </div>
          <div className="sn-dos">
            <div className="sn-col sn-col-gris">
              <div className="sn-col-tit">Lo que trae su pastilla</div>
              <div className="sn-pildora" aria-hidden="true" />
              <ul><li>La hormona (T4)</li></ul>
            </div>
            <div className="sn-mas" aria-hidden="true">+</div>
            <div className="sn-col sn-col-verde">
              <div className="sn-col-tit">Lo que su tiroides necesita además</div>
              <ul className="sn-chips">
                {NUTRI.map(([n]) => <li key={n}>{n}</li>)}
              </ul>
            </div>
          </div>
          <p className="sn-nota">Ni se le ocurra dejar la pastilla. Lo que yo encontré no la reemplaza: la acompaña.</p>
        </section>

        <section className="sn-bloque">
          <h2 className="sn-h2">Todo lo que yo ya había probado</h2>
          <figure className="sn-fig sn-fig-ancha">
            <Image src={`${IMG}/lo-que-probe.jpg`} alt="Champús, gomitas de biotina, multivitamínico, té y sal baja en sodio sobre el mesón del baño" width={1000} height={750} />
          </figure>
          <ol className="sn-ranking">
            <li className="sn-rk sn-rk-no"><span className="sn-rk-marca" aria-hidden="true">×</span><div><strong>Champús y biotina</strong><span>El pelo seguía saliendo. Ayudan por fuera, no por dentro.</span></div></li>
            <li className="sn-rk sn-rk-no"><span className="sn-rk-marca" aria-hidden="true">×</span><div><strong>Dietas y dejar la sal</strong><span>La hinchazón no se iba.</span></div></li>
            <li className="sn-rk sn-rk-medio"><span className="sn-rk-marca" aria-hidden="true">~</span><div><strong>Multivitamínico de droguería</strong><span>Trae de todo un poquito, no lo que la tiroides pide.</span></div></li>
            <li className="sn-rk sn-rk-medio"><span className="sn-rk-marca" aria-hidden="true">~</span><div><strong>Suplementos importados</strong><span>Varios frascos, en dólares, más de $300.000 al mes.</span></div></li>
            <li className="sn-rk sn-rk-si"><span className="sn-rk-marca" aria-hidden="true">✓</span><div><strong>Mi Tiroides</strong><span>Los 6 nutrientes en una cápsula, hecho en Colombia, registro INVIMA.</span></div></li>
          </ol>
        </section>

        <section className="sn-bloque sn-producto">
          <h2 className="sn-h2">Lo que encontré: los 6 en una sola cápsula</h2>
          <div className="sn-prod-fila">
            <Image src={`${IMG}/bundle-1.webp`} alt="Frasco de Mi Tiroides Avanzado, 90 cápsulas vegetales" width={300} height={300} className="sn-prod-img" />
            <div className="sn-texto">
              <p>Se llama Mi Tiroides Avanzado. Es colombiano, tiene registro INVIMA y trae justo los 6 nutrientes que mi pastilla no trae.</p>
            </div>
          </div>
          <ul className="sn-nutri">
            {NUTRI.map(([n, d]) => <li key={n}><strong>{n}</strong><span>{d}</span></li>)}
          </ul>
          <div className="sn-sellos">
            <span>Registro INVIMA</span>
            <span>Hecho en Colombia</span>
            <span>Vegano</span>
            <span>Sin gluten</span>
          </div>
        </section>

        <section className="sn-bloque">
          <h2 className="sn-h2">Cómo me lo tomo</h2>
          <div className="sn-par-fotos">
            <Image src={`${IMG}/nota-nevera.jpg`} alt="Nota en la nevera: pastilla en ayunas solo con agua; Mi Tiroides, 2 con el desayuno" width={900} height={1200} />
            <Image src={`${IMG}/sincara-1.webp`} alt="Desayuno con arepa, tinto y el frasco de Mi Tiroides en la mesa" width={600} height={750} />
          </div>
          <div className="sn-texto">
            <p>Le puse una nota a la nevera para no enredarme. La pastilla, igual que siempre: en ayunas y solo con agua. Media hora después, con el desayuno, 2 cápsulas de Mi Tiroides. Eso es todo.</p>
          </div>
        </section>

        <section className="sn-bloque">
          <h2 className="sn-h2">Qué noté y cuándo</h2>
          <ol className="sn-linea">
            <li><strong>Semanas 2 a 4</strong><span>Me levantaba menos pesada. Dejé de necesitar la siesta de la tarde.</span></li>
            <li><strong>Mes 2</strong><span>Menos pelo en el cepillo. La cara menos hinchada al despertar.</span></li>
            <li><strong>Mes 3</strong><span>Las uñas, que fueron lo último en cambiar.</span></li>
          </ol>
          <p className="sn-nota">Es un tratamiento, no un milagro. Cada cuerpo va a su ritmo, y por eso casi todas empiezan con el de 2 frascos: son 90 días.</p>
        </section>

        <section className="sn-bloque">
          <h2 className="sn-h2">Lo que escriben otras clientas</h2>
          <p className="sn-mini">Mensajes reales que llegan a nuestro WhatsApp. Los publicamos sin nombre.</p>
          <div className="sn-chat">
            {CHAT.map((m) => (
              <div className="sn-chat-msg" key={m}><p>{m}</p><span>✓✓</span></div>
            ))}
          </div>
        </section>

        <section className="sn-oferta" id="oferta">
          <h2 className="sn-h2">Si se identificó con 2 o más señales</h2>
          <p className="sn-oferta-sub">
            Empiece hoy y no pague nada ahora. <strong>+6.600 pedidos entregados en 511 municipios de Colombia.</strong>
          </p>
          {oferta}
          <button className="btn btn-block v6b-cta" onClick={openModal}>
            Pedir ahora · paga al recibir
            <span>{planLabel} · {precio} · envío gratis</span>
          </button>
          <div className="hero-checks">
            <div>No paga nada hoy: paga en efectivo cuando lo recibe</div>
            <div>Envío gratis a toda Colombia · llega en 1-3 días</div>
            <div><strong>Garantía de 90 días</strong> desde el día que lo recibe</div>
            <div>Va con su pastilla, no la reemplaza</div>
          </div>
        </section>

        <section className="sn-bloque">
          <h2 className="sn-h2">Lo que casi todas preguntan</h2>
          <div className="sn-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="sn-cierre">
          <p>Yo duré años pensando que era la edad. Si usted se vio en estas señales, no espere tanto como yo.</p>
          <button className="btn btn-block v6b-cta" onClick={openModal}>
            Quiero empezar mi tratamiento
            <span>{planLabel} · {precio} · paga al recibir</span>
          </button>
        </section>

        <footer className="sn-pie">
          <p>{AVISO.replace(/\.$/, "")}; los comentarios citados son reales y se publican sin nombre. Mi Tiroides Avanzado es un producto natural con registro INVIMA: no es un medicamento ni reemplaza el tratamiento que le indicó su médico. Los resultados varían de una persona a otra.</p>
          <p>MI TIROIDES Avanzado · Hecho en Colombia · Registro INVIMA</p>
        </footer>
      </main>
    </>
  );
}
