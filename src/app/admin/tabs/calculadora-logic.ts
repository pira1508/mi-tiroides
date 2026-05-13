/**
 * Lógica de la calculadora de unit economics — réplica del Google Sheet.
 *
 * Variables a reemplazar (celdas amarillas en el sheet):
 *  - tasaDespachos     · 80%
 *  - tasaDevolucion    · 20%   (de los despachados, % que se devuelven)
 *  - pctPublicidad     · 25%   (objetivo de pauta como % del precio)
 *  - utilidadEsperada  · 10%   (margen objetivo)
 *  - inefectividad     · 36%   (1 - tasaDespachos × (1 - devolución))
 *  - costoProducto     · $12.000
 *  - costoFleteProm    · $16.000
 *  - costoAdmin        · $0
 *  - precioEstablecido · $89.900
 *
 * Cálculos:
 *  - Despachado = Facturado × tasaDespachos
 *  - Entregado  = Despachado × (1 − tasaDevolucion)
 *  - Devolución = Despachado × tasaDevolucion (paga flete igual)
 *  - Cancelado  = no aplica (se excluye desde antes)
 */

export type CalcInputs = {
  // Logística (top bar amarillo en el sheet)
  tasaDespachos: number;        // 0..1
  tasaDevolucion: number;       // 0..1
  pctPublicidad: number;        // 0..1 — objetivo de pauta como % del precio
  utilidadEsperada: number;     // 0..1 — margen objetivo

  // Costos por unidad
  costoProducto: number;        // por frasco
  costoFleteProm: number;       // por despacho (entregado o devuelto)
  costoAdministrativo: number;  // por pedido

  // Precio
  precioEstablecido: number;

  // Simulador (lado derecho)
  pedidosFacturados: number;
  unidadesFacturadas: number;
  pautaGastada: number;
};

export type CalcResults = {
  // Embudo
  pedidosDespachados: number;
  pedidosEntregados: number;
  pedidosDevueltos: number;

  // Facturación
  facturadoBruto: number;
  facturadoDespachado: number;
  facturadoEntregado: number;
  ticketPromedio: number;

  // Costos totales
  costoProductoTotal: number;
  costoFleteTotal: number;       // flete × despachados (incluye devoluciones)
  costoAdminTotal: number;
  costoPauta: number;
  costosTotales: number;

  // Resultados
  utilidadNeta: number;
  margenNeto: number;
  utilidadPorPedido: number;

  // Tabla "ITEM | VALOR | % vs Precio | Precio con devolución/inefectividad"
  // Cada fila tiene su % sobre precio establecido y su versión ajustada por inefectividad
  inefectividad: number;            // = 1 − tasaDespachos × (1 − tasaDevolucion)
  fleteCostoPorEntregado: number;   // flete absorbido por cada entregado (flete × desp / ent)
  cpaCalculado: number;             // pauta real / entregados
  cpaMinimo: number;                // pctPublicidad × precio × (1 + inefectividad)
  cpaCosteado: number;              // CPA equivalente para alcanzar utilidadEsperada
  totalCostosUnitario: number;      // producto + flete + admin + cpaCosteado
  precioSugerido: number;           // precio mínimo para sostener utilidadEsperada
  cpaBreakEven: number;             // precio - producto - flete - admin

  // Tabla simulador (lado derecho): cada fila tiene # y valor
  // Producto en COP por unidad despachada * unidades despachadas
  // % sobre ingreso entregado
  roas: number;
};

export const DEFAULT_INPUTS: CalcInputs = {
  tasaDespachos: 0.8,
  tasaDevolucion: 0.2,
  pctPublicidad: 0.25,
  utilidadEsperada: 0.10,

  costoProducto: 12000,
  costoFleteProm: 16000,
  costoAdministrativo: 0,

  precioEstablecido: 89900,

  pedidosFacturados: 100,
  unidadesFacturadas: 100,
  pautaGastada: 2000000,
};

export function calcular(input: CalcInputs): CalcResults {
  const i = input;

  // Embudo
  const pedidosDespachados = i.pedidosFacturados * i.tasaDespachos;
  const pedidosDevueltos = pedidosDespachados * i.tasaDevolucion;
  const pedidosEntregados = pedidosDespachados - pedidosDevueltos;

  const ratioUnidPorPed = i.pedidosFacturados > 0 ? i.unidadesFacturadas / i.pedidosFacturados : 1;
  const unidadesDespachadas = pedidosDespachados * ratioUnidPorPed;

  // Inefectividad = 1 − tasa_efectiva = 1 − (tasaDespachos × (1 − tasaDevolucion))
  const tasaEfectiva = i.tasaDespachos * (1 - i.tasaDevolucion);
  const inefectividad = 1 - tasaEfectiva;

  // Facturación
  const facturadoBruto = i.pedidosFacturados * i.precioEstablecido;
  const facturadoDespachado = pedidosDespachados * i.precioEstablecido;
  const facturadoEntregado = pedidosEntregados * i.precioEstablecido;
  const ticketPromedio = i.precioEstablecido;

  // Costos totales del período
  const costoProductoTotal = unidadesDespachadas * i.costoProducto;
  const costoFleteTotal = pedidosDespachados * i.costoFleteProm;
  const costoAdminTotal = i.pedidosFacturados * i.costoAdministrativo;
  const costoPauta = i.pautaGastada;
  const costosTotales = costoProductoTotal + costoFleteTotal + costoAdminTotal + costoPauta;

  const utilidadNeta = facturadoEntregado - costosTotales;
  const margenNeto = facturadoEntregado > 0 ? utilidadNeta / facturadoEntregado : 0;
  const utilidadPorPedido = i.pedidosFacturados > 0 ? utilidadNeta / i.pedidosFacturados : 0;

  // Costos unitarios "por entregado" (para tabla item/valor)
  const fleteCostoPorEntregado = pedidosEntregados > 0
    ? costoFleteTotal / pedidosEntregados
    : i.costoFleteProm;

  // CPA calculado (real, basado en pauta gastada)
  const cpaCalculado = pedidosEntregados > 0 ? costoPauta / pedidosEntregados : 0;
  // CPA mínimo: % publicidad sobre precio × (1 + inefectividad) — costo total marketing por entregado
  const cpaMinimo = i.pctPublicidad * i.precioEstablecido;
  // CPA costeado: el CPA que tendrías que sostener para llegar a utilidadEsperada
  // Igual al CPA mínimo pero amplificado por inefectividad
  const cpaCosteado = cpaMinimo * (1 + inefectividad);

  // Tabla "ITEM | VALOR | % | Precio con devolución":
  // Producto absorbe el costo del producto sobre lo entregado
  const costoProductoPorEntregado = ratioUnidPorPed * i.costoProducto;
  const totalCostosUnitario = costoProductoPorEntregado + fleteCostoPorEntregado + i.costoAdministrativo + cpaCosteado;

  // Precio sugerido para alcanzar utilidadEsperada
  const precioSugerido = i.utilidadEsperada < 1
    ? totalCostosUnitario / (1 - i.utilidadEsperada)
    : totalCostosUnitario;

  // CPA break-even: máximo CPA sostenible para no perder por entregado
  const cpaBreakEven = i.precioEstablecido - costoProductoPorEntregado - fleteCostoPorEntregado - i.costoAdministrativo;

  const roas = costoPauta > 0 ? facturadoEntregado / costoPauta : 0;

  return {
    pedidosDespachados,
    pedidosEntregados,
    pedidosDevueltos,
    facturadoBruto,
    facturadoDespachado,
    facturadoEntregado,
    ticketPromedio,
    costoProductoTotal,
    costoFleteTotal,
    costoAdminTotal,
    costoPauta,
    costosTotales,
    utilidadNeta,
    margenNeto,
    utilidadPorPedido,
    inefectividad,
    fleteCostoPorEntregado,
    cpaCalculado,
    cpaMinimo,
    cpaCosteado,
    totalCostosUnitario,
    precioSugerido,
    cpaBreakEven,
    roas,
  };
}

// ====== Ofertas de cantidad ======

export type Oferta = {
  unidades: number;
  precio: number;
  utilidad: number;
  pctUtilidad: number;
};

export function calcularOferta(input: CalcInputs, precio: number, unidades: number): Oferta {
  // costo unitario × unidades + flete (1 envío, las unidades van juntas) + admin + cpa
  const tasaEfectiva = input.tasaDespachos * (1 - input.tasaDevolucion);
  const inefectividad = 1 - tasaEfectiva;
  const cpa = input.pctPublicidad * input.precioEstablecido * (1 + inefectividad);
  const costoTotal = unidades * input.costoProducto + input.costoFleteProm + input.costoAdministrativo + cpa;
  const utilidad = precio - costoTotal;
  const pctUtilidad = precio > 0 ? utilidad / precio : 0;
  return { unidades, precio, utilidad, pctUtilidad };
}

// ====== Formato ======

export const fmtCOP = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-CO");

export const fmtCOPshort = (n: number) =>
  "$ " + Math.round(n).toLocaleString("es-CO");

export const fmtPct = (n: number) =>
  (n * 100).toFixed(1) + "%";

export const fmtPct0 = (n: number) =>
  Math.round(n * 100) + "%";

export const fmtInt = (n: number) =>
  Math.round(n).toLocaleString("es-CO");
