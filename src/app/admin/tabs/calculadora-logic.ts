/**
 * Lógica de la calculadora de unit economics (réplica del Google Sheet original).
 *
 * Modelo:
 *  - Vendés N pedidos. De esos, solo "tasaDespachos" se despachan.
 *  - De los despachados, un % se entrega y un % se devuelve.
 *  - Pagás flete por TODOS los despachados (los devueltos también gastan flete).
 *  - Pauta y administrativo son costos fijos del período.
 *  - Utilidad neta = ingresos por entregados − costos totales.
 */

export type CalcInputs = {
  precioEstablecido: number;     // precio unitario que cobrás (ej $89.900)
  costoProducto: number;         // costo del producto por unidad
  costoFleteProm: number;        // flete promedio por despacho (sin importar si entrega)
  costoAdministrativo: number;   // costo admin por pedido (ej $0)
  pedidosFacturados: number;     // # de pedidos facturados (confirmados)
  unidadesFacturadas: number;    // # de unidades totales (puede diferir de pedidos si vende packs)
  tasaDespachos: number;         // 0..1 — % de pedidos que efectivamente se despachan
  tasaDevolucion: number;        // 0..1 — % de despachados que se devuelven
  pautaGastada: number;          // gasto publicitario del período (COP)
};

export type CalcResults = {
  // Embudo
  pedidosDespachados: number;
  pedidosEntregados: number;
  pedidosDevueltos: number;

  // Facturación
  facturadoBruto: number;       // precio × pedidos facturados (antes de cancelaciones)
  facturadoDespachado: number;  // precio × despachados
  facturadoEntregado: number;   // precio × entregados (ingreso real)
  ticketPromedio: number;

  // Costos
  costoProductoTotal: number;   // costo producto × unidades despachadas
  costoFleteTotal: number;      // flete × despachados (devueltos también pagan flete)
  costoAdminTotal: number;
  costoPauta: number;
  costosTotales: number;

  // Resultados
  utilidadNeta: number;
  margenNeto: number;           // % sobre facturado entregado
  utilidadPorPedido: number;    // utilidad / pedidos facturados

  // Marketing
  cpaCalculado: number;         // pauta / entregados (CPA real)
  cpaBreakEven: number;         // máximo CPA sostenible para no perder plata
  roas: number;                 // facturadoEntregado / pauta
};

export const DEFAULT_INPUTS: CalcInputs = {
  precioEstablecido: 89900,
  costoProducto: 12000,
  costoFleteProm: 16000,
  costoAdministrativo: 0,
  pedidosFacturados: 100,
  unidadesFacturadas: 100,
  tasaDespachos: 0.8,
  tasaDevolucion: 0.2,
  pautaGastada: 2000000,
};

export function calcular(input: CalcInputs): CalcResults {
  const i = input;

  const pedidosDespachados = i.pedidosFacturados * i.tasaDespachos;
  const pedidosDevueltos = pedidosDespachados * i.tasaDevolucion;
  const pedidosEntregados = pedidosDespachados - pedidosDevueltos;

  // Unidades despachadas (proporcional)
  const ratioUnidPorPed = i.pedidosFacturados > 0 ? i.unidadesFacturadas / i.pedidosFacturados : 1;
  const unidadesDespachadas = pedidosDespachados * ratioUnidPorPed;
  const unidadesEntregadas = pedidosEntregados * ratioUnidPorPed;

  const facturadoBruto = i.pedidosFacturados * i.precioEstablecido;
  const facturadoDespachado = pedidosDespachados * i.precioEstablecido;
  const facturadoEntregado = pedidosEntregados * i.precioEstablecido;
  const ticketPromedio = i.precioEstablecido;

  // Costos: el flete se paga por TODO lo despachado, no solo lo entregado
  const costoProductoTotal = unidadesDespachadas * i.costoProducto;
  const costoFleteTotal = pedidosDespachados * i.costoFleteProm;
  const costoAdminTotal = i.pedidosFacturados * i.costoAdministrativo;
  const costoPauta = i.pautaGastada;
  const costosTotales = costoProductoTotal + costoFleteTotal + costoAdminTotal + costoPauta;

  const utilidadNeta = facturadoEntregado - costosTotales;
  const margenNeto = facturadoEntregado > 0 ? utilidadNeta / facturadoEntregado : 0;
  const utilidadPorPedido = i.pedidosFacturados > 0 ? utilidadNeta / i.pedidosFacturados : 0;

  const cpaCalculado = pedidosEntregados > 0 ? costoPauta / pedidosEntregados : 0;

  // Break-even CPA: cuánto podés gastar máximo por entregado sin perder plata.
  // Ingreso por entregado − costo producto − flete (que aplica a despachados, repartido)
  const ingresoUnitarioEntregado = i.precioEstablecido;
  const costoUnidadEntregado = ratioUnidPorPed * i.costoProducto;
  // Flete por entregado = flete × despachados / entregados (porque el flete se paga sobre despachados)
  const fletePorEntregado = pedidosEntregados > 0
    ? (pedidosDespachados * i.costoFleteProm) / pedidosEntregados
    : i.costoFleteProm;
  const cpaBreakEven = ingresoUnitarioEntregado - costoUnidadEntregado - fletePorEntregado - i.costoAdministrativo;

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
    cpaCalculado,
    cpaBreakEven,
    roas,
  };
}

export const fmtCOP = (n: number) =>
  "$" + Math.round(n).toLocaleString("es-CO");

export const fmtPct = (n: number) =>
  (n * 100).toFixed(1) + "%";

export const fmtInt = (n: number) =>
  Math.round(n).toLocaleString("es-CO");
