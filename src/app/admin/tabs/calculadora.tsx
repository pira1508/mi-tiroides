"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalcInputs,
  CalcResults,
  DEFAULT_INPUTS,
  calcular,
  calcularOferta,
  fmtCOP,
  fmtInt,
  fmtPct,
  fmtPct0,
} from "./calculadora-logic";

type RealData = {
  rango: { from: string | null; to: string | null };
  pedidos: { facturados: number; despachados: number; entregados: number; devueltos: number; novedades: number; cancelados: number };
  tasas: { despachos: number; entrega: number; devolucion: number };
  unidades: { facturadas: number; despachadas: number };
  finanzas: { facturadoBruto: number; entregadoFacturado: number; ticketPromedio: number; pautaGastada: number };
};

type SubTab = "manual" | "real";

// ===== Helpers de fecha =====
const todayISO = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const startOfMonthISO = (off = 0) => { const d = new Date(); d.setMonth(d.getMonth() + off, 1); return d.toISOString().slice(0, 10); };
const endOfMonthISO = (off = 0) => { const d = new Date(); d.setMonth(d.getMonth() + off + 1, 0); return d.toISOString().slice(0, 10); };

// ===== Colores (igual al sheet) =====
const COLORS = {
  headerBlue: "#4A6FA5",
  headerLight: "#D7E4F2",
  cellYellow: "#FFF59D",
  cellGreen: "#C8E6C9",
  cellGrey: "#ECEFF1",
  border: "#B0BEC5",
  text: "#212121",
};

// ===== Componente principal =====
export function Calculadora() {
  const [subtab, setSubtab] = useState<SubTab>("real");

  // Inputs manuales (persisten en localStorage)
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("calc-manual-v2");
      if (saved) setInputs({ ...DEFAULT_INPUTS, ...JSON.parse(saved) });
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("calc-manual-v2", JSON.stringify(inputs)); } catch {}
  }, [inputs]);

  // Estado del tab REAL
  const [from, setFrom] = useState<string>(isoDaysAgo(7));
  const [to, setTo] = useState<string>(todayISO());
  const [realData, setRealData] = useState<RealData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // En el tab REAL, las % de logística, costos y precios vienen sobreescritos por defecto
  // PERO siguen siendo editables (el sheet permite cambiar todo).
  const [realInputs, setRealInputs] = useState<CalcInputs>(DEFAULT_INPUTS);

  async function cargarReal() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/calculadora?from=${from}&to=${to}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as RealData;
      setRealData(data);
      // Re-hidratar realInputs con los valores reales
      setRealInputs((prev) => ({
        ...prev,
        pedidosFacturados: data.pedidos.facturados,
        unidadesFacturadas: data.unidades.facturadas,
        tasaDespachos: data.pedidos.facturados > 0 ? data.pedidos.despachados / data.pedidos.facturados : prev.tasaDespachos,
        tasaDevolucion: data.pedidos.despachados > 0 ? data.pedidos.devueltos / data.pedidos.despachados : prev.tasaDevolucion,
        pautaGastada: data.finanzas.pautaGastada || prev.pautaGastada,
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (subtab === "real") cargarReal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtab, from, to]);

  const activeInputs = subtab === "manual" ? inputs : realInputs;
  const setActiveInputs = subtab === "manual" ? setInputs : setRealInputs;
  const results = useMemo(() => calcular(activeInputs), [activeInputs]);

  return (
    <div className="card">
      {/* Encabezado: switch + filtros */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Calculadora de unit economics</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setSubtab("real")} style={tabBtn(subtab === "real")}>Tiempo real</button>
          <button onClick={() => setSubtab("manual")} style={tabBtn(subtab === "manual")}>Manual</button>
        </div>
      </div>

      {subtab === "real" && (
        <RangoControl
          from={from} to={to} setFrom={setFrom} setTo={setTo}
          loading={loading} reload={cargarReal} realData={realData} err={err}
        />
      )}

      <SheetLayout
        inputs={activeInputs}
        setInputs={setActiveInputs}
        results={results}
        readonlyInputs={subtab === "real" ? new Set<keyof CalcInputs>(["pedidosFacturados", "unidadesFacturadas", "tasaDespachos", "tasaDevolucion", "pautaGastada"]) : new Set()}
        labelExtra={subtab === "real" ? "(amarillo = costos editables · gris = de DB / Meta)" : "(amarillo = editable)"}
      />
    </div>
  );
}

// ===== Sub-componente: control de rango =====

function RangoControl({
  from, to, setFrom, setTo, loading, reload, realData, err,
}: {
  from: string; to: string;
  setFrom: (s: string) => void; setTo: (s: string) => void;
  loading: boolean; reload: () => void;
  realData: RealData | null;
  err: string | null;
}) {
  const presets = [
    { label: "Hoy", from: todayISO(), to: todayISO() },
    { label: "Últimos 7d", from: isoDaysAgo(7), to: todayISO() },
    { label: "Últimos 30d", from: isoDaysAgo(30), to: todayISO() },
    { label: "Este mes", from: startOfMonthISO(0), to: todayISO() },
    { label: "Mes pasado", from: startOfMonthISO(-1), to: endOfMonthISO(-1) },
  ];
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap", background: "#F8F9FA", padding: 10, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>RANGO:</span>
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={dateInputStyle} />
      <span>→</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={dateInputStyle} />
      <div style={{ display: "flex", gap: 4 }}>
        {presets.map((p) => (
          <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }} style={presetBtn}>
            {p.label}
          </button>
        ))}
      </div>
      <button onClick={reload} disabled={loading} style={{ ...presetBtn, background: "#2E7D32", color: "#fff", fontWeight: 700, marginLeft: "auto" }}>
        {loading ? "Cargando…" : "↻ Refrescar"}
      </button>
      {realData && (
        <div style={{ width: "100%", display: "flex", gap: 18, marginTop: 6, fontSize: 12, color: "#555" }}>
          <span>📦 <b>{realData.pedidos.facturados}</b> facturados</span>
          <span>🚚 <b>{realData.pedidos.despachados}</b> despachados</span>
          <span>✅ <b>{realData.pedidos.entregados}</b> entregados</span>
          <span>🔁 <b>{realData.pedidos.devueltos}</b> devoluciones</span>
          <span>❌ <b>{realData.pedidos.cancelados}</b> cancelados (no se despacharon)</span>
          <span style={{ marginLeft: "auto" }}>💸 Meta: <b>{fmtCOP(realData.finanzas.pautaGastada)}</b></span>
        </div>
      )}
      {err && <div style={{ width: "100%", color: "#C62828", fontSize: 12 }}>Error: {err}</div>}
    </div>
  );
}

// ===== Layout principal estilo SHEET =====

function SheetLayout({
  inputs, setInputs, results, readonlyInputs, labelExtra,
}: {
  inputs: CalcInputs;
  setInputs: (i: CalcInputs) => void;
  results: CalcResults;
  readonlyInputs: Set<keyof CalcInputs>;
  labelExtra: string;
}) {
  const upd = (patch: Partial<CalcInputs>) => setInputs({ ...inputs, ...patch });

  const oferta2 = calcularOferta(inputs, 119000, 2);
  const oferta3 = calcularOferta(inputs, 148100, 3);

  return (
    <div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>{labelExtra}</div>

      {/* ============ BANNER LOGÍSTICA + OFERTAS (top del sheet) ============ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <SectionTitle title="LOGÍSTICA" />
        <SectionTitle title="OFERTAS DE CANTIDAD" />

        {/* Logística — 5 valores en fila */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th>TASA DESPACHOS</Th>
              <Th>% DEVOLUCIONES</Th>
              <Th>% PUBLICIDAD</Th>
              <Th>UTILIDAD ESPERADA</Th>
              <Th>INEFECTIVIDAD</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td yellow><Pct value={inputs.tasaDespachos} onChange={(v) => upd({ tasaDespachos: v })} readonly={readonlyInputs.has("tasaDespachos")} /></Td>
              <Td yellow><Pct value={inputs.tasaDevolucion} onChange={(v) => upd({ tasaDevolucion: v })} readonly={readonlyInputs.has("tasaDevolucion")} /></Td>
              <Td yellow><Pct value={inputs.pctPublicidad} onChange={(v) => upd({ pctPublicidad: v })} readonly={readonlyInputs.has("pctPublicidad")} /></Td>
              <Td yellow><Pct value={inputs.utilidadEsperada} onChange={(v) => upd({ utilidadEsperada: v })} readonly={readonlyInputs.has("utilidadEsperada")} /></Td>
              <Td>{fmtPct(results.inefectividad)}</Td>
            </tr>
          </tbody>
        </table>

        {/* Ofertas — 2 unidades / 3 unidades */}
        <table style={tableStyle}>
          <thead>
            <tr>
              <Th colSpan={3}>2 unidades</Th>
              <Th colSpan={3}>3 unidades</Th>
            </tr>
            <tr>
              <Th>Precio</Th><Th>Utilidad</Th><Th>%</Th>
              <Th>Precio</Th><Th>Utilidad</Th><Th>%</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td yellow>{fmtCOP(oferta2.precio)}</Td>
              <Td>{fmtCOP(oferta2.utilidad)}</Td>
              <Td>{fmtPct0(oferta2.pctUtilidad)}</Td>
              <Td yellow>{fmtCOP(oferta3.precio)}</Td>
              <Td>{fmtCOP(oferta3.utilidad)}</Td>
              <Td>{fmtPct0(oferta3.pctUtilidad)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ============ NOMBRE PRODUCTO + SIMULADOR ============ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* LADO IZQUIERDO: ITEM / VALOR / % / Precio con devolución */}
        <div>
          <SectionTitle title="NOMBRE PRODUCTO" subtitle="MI TIROIDES" />
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th align="left">Item</Th>
                <Th>Valor</Th>
                <Th>% vs Precio</Th>
                <Th>Precio con dev/inef</Th>
              </tr>
            </thead>
            <tbody>
              {/* Producto */}
              <ItemRow
                label="Producto"
                value={inputs.costoProducto}
                onChange={(v) => upd({ costoProducto: v })}
                readonly={readonlyInputs.has("costoProducto")}
                precioEstab={inputs.precioEstablecido}
                ajustado={inputs.costoProducto * (1 + results.inefectividad) - inputs.costoProducto}
              />
              {/* Flete */}
              <ItemRow
                label="Flete Promedio"
                value={inputs.costoFleteProm}
                onChange={(v) => upd({ costoFleteProm: v })}
                readonly={readonlyInputs.has("costoFleteProm")}
                precioEstab={inputs.precioEstablecido}
                ajustado={results.fleteCostoPorEntregado}
              />
              {/* Admin */}
              <ItemRow
                label="Administrativos"
                value={inputs.costoAdministrativo}
                onChange={(v) => upd({ costoAdministrativo: v })}
                readonly={readonlyInputs.has("costoAdministrativo")}
                precioEstab={inputs.precioEstablecido}
                ajustado={inputs.costoAdministrativo}
              />
              {/* CPA calculado (real) */}
              <tr>
                <Td align="left">CPA Calculado</Td>
                <Td>{fmtCOP(results.cpaCalculado)}</Td>
                <Td>{fmtPct0(results.cpaCalculado / Math.max(inputs.precioEstablecido, 1))}</Td>
                <Td>{fmtCOP(results.cpaCalculado * (1 + results.inefectividad))}</Td>
              </tr>
              {/* CPA mínimo */}
              <tr>
                <Td align="left">CPA Mínimo</Td>
                <Td>{fmtCOP(results.cpaMinimo)}</Td>
                <Td>{fmtPct0(inputs.pctPublicidad)}</Td>
                <Td>{fmtCOP(results.cpaCosteado)}</Td>
              </tr>
              {/* CPA costeado */}
              <tr>
                <Td align="left">CPA Costeado</Td>
                <Td>{fmtCOP(results.cpaCosteado)}</Td>
                <Td>{fmtPct0(results.cpaCosteado / Math.max(inputs.precioEstablecido, 1))}</Td>
                <Td>{fmtCOP(results.cpaCosteado * (1 + results.inefectividad))}</Td>
              </tr>
              {/* Total costos */}
              <tr style={{ background: COLORS.cellGrey, fontWeight: 700 }}>
                <Td align="left">TOTAL COSTOS</Td>
                <Td>{fmtCOP(inputs.costoProducto + inputs.costoFleteProm + inputs.costoAdministrativo + results.cpaMinimo)}</Td>
                <Td>{fmtPct0((inputs.costoProducto + inputs.costoFleteProm + inputs.costoAdministrativo + results.cpaMinimo) / Math.max(inputs.precioEstablecido, 1))}</Td>
                <Td>{fmtCOP(results.totalCostosUnitario)}</Td>
              </tr>
              {/* Precio Sugerido */}
              <tr>
                <Td align="left">Precio Sugerido</Td>
                <Td></Td>
                <Td></Td>
                <Td>{fmtCOP(results.precioSugerido)}</Td>
              </tr>
            </tbody>
          </table>

          {/* Fila Precio establecido / Utilidad / CPA break even */}
          <table style={{ ...tableStyle, marginTop: 10 }}>
            <thead>
              <tr>
                <Th align="left"></Th>
                <Th>% ingreso</Th>
                <Th>VLR</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td align="left">Precio Establecido</Td>
                <Td>{fmtPct0(1 - results.totalCostosUnitario / Math.max(inputs.precioEstablecido, 1) - inputs.utilidadEsperada)}</Td>
                <Td yellow><Money value={inputs.precioEstablecido} onChange={(v) => upd({ precioEstablecido: v })} readonly={readonlyInputs.has("precioEstablecido")} /></Td>
              </tr>
              <tr style={{ background: COLORS.cellGreen, fontWeight: 700 }}>
                <Td align="left">Utilidad</Td>
                <Td>{fmtPct(inputs.utilidadEsperada)}</Td>
                <Td>{fmtCOP(inputs.precioEstablecido * inputs.utilidadEsperada)}</Td>
              </tr>
              <tr>
                <Td align="left">CPA Break Even</Td>
                <Td></Td>
                <Td>{fmtCOP(results.cpaBreakEven)}</Td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* LADO DERECHO: SIMULADOR */}
        <div>
          <SectionTitle title="SIMULADOR" />
          <table style={tableStyle}>
            <thead>
              <tr>
                <Th align="left"></Th>
                <Th>% vs Entregas</Th>
                <Th># Pedidos</Th>
                <Th>VLR</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td align="left">FACTURADO</Td>
                <Td></Td>
                <Td yellow><Int value={inputs.pedidosFacturados} onChange={(v) => upd({ pedidosFacturados: v, unidadesFacturadas: Math.max(v, inputs.unidadesFacturadas) })} readonly={readonlyInputs.has("pedidosFacturados")} /></Td>
                <Td>{fmtCOP(results.facturadoBruto)}</Td>
              </tr>
              <tr>
                <Td align="left">DESPACHADO</Td>
                <Td></Td>
                <Td>{fmtInt(results.pedidosDespachados)}</Td>
                <Td>{fmtCOP(results.facturadoDespachado)}</Td>
              </tr>
              <tr>
                <Td align="left">ENTREGADO</Td>
                <Td></Td>
                <Td>{fmtInt(results.pedidosEntregados)}</Td>
                <Td>{fmtCOP(results.facturadoEntregado)}</Td>
              </tr>
              <tr>
                <Td align="left">DEVOLUCIÓN</Td>
                <Td>{fmtPct0(inputs.tasaDevolucion)}</Td>
                <Td>{fmtInt(results.pedidosDevueltos)}</Td>
                <Td>{fmtCOP(results.pedidosDevueltos * inputs.costoFleteProm)}</Td>
              </tr>
              <tr>
                <Td align="left">TICKET PROMEDIO</Td>
                <Td></Td>
                <Td></Td>
                <Td>{fmtCOP(results.ticketPromedio)}</Td>
              </tr>
              <tr>
                <Td align="left">COSTOS DE PRODUCTO</Td>
                <Td>{fmtPct0(results.costoProductoTotal / Math.max(results.facturadoEntregado, 1))}</Td>
                <Td></Td>
                <Td>{fmtCOP(results.costoProductoTotal)}</Td>
              </tr>
              <tr>
                <Td align="left">VLR FLETE (despachados)</Td>
                <Td>{fmtPct0(results.costoFleteTotal / Math.max(results.facturadoEntregado, 1))}</Td>
                <Td></Td>
                <Td>{fmtCOP(results.costoFleteTotal)}</Td>
              </tr>
              <tr>
                <Td align="left">GASTO PUBLICITARIO</Td>
                <Td>{fmtPct0(results.costoPauta / Math.max(results.facturadoEntregado, 1))}</Td>
                <Td></Td>
                <Td yellow><Money value={inputs.pautaGastada} onChange={(v) => upd({ pautaGastada: v })} readonly={readonlyInputs.has("pautaGastada")} /></Td>
              </tr>
              <tr>
                <Td align="left">GASTOS ADMINISTRATIVOS</Td>
                <Td>{fmtPct0(results.costoAdminTotal / Math.max(results.facturadoEntregado, 1))}</Td>
                <Td></Td>
                <Td>{fmtCOP(results.costoAdminTotal)}</Td>
              </tr>
              <tr style={{ background: COLORS.cellGreen, fontWeight: 700, fontSize: 15 }}>
                <Td align="left">GANANCIA</Td>
                <Td>{fmtPct(results.margenNeto)}</Td>
                <Td></Td>
                <Td>{fmtCOP(results.utilidadNeta)}</Td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: 8, fontSize: 11, color: "#777", lineHeight: 1.5 }}>
            * Devoluciones pagan flete (ya incluido en VLR FLETE).<br />
            * Cancelados no aparecen acá: no se despacharon y no cuentan en facturado/devoluciones.<br />
            * ROAS = {results.roas.toFixed(2)}x  ·  CPA real = {fmtCOP(results.cpaCalculado)}  ·  Break-even = {fmtCOP(results.cpaBreakEven)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Sub-componentes UI =====

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ background: COLORS.headerBlue, color: "#fff", padding: "6px 10px", fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textAlign: "center", borderRadius: "4px 4px 0 0" }}>
      {title}{subtitle && <span style={{ marginLeft: 8, opacity: 0.85, fontWeight: 600 }}>· {subtitle}</span>}
    </div>
  );
}

function Th({ children, colSpan, align = "center" }: { children?: React.ReactNode; colSpan?: number; align?: "left" | "center" | "right" }) {
  return (
    <th colSpan={colSpan} style={{
      background: COLORS.headerLight, color: COLORS.text, fontSize: 11, fontWeight: 700,
      padding: "6px 8px", border: `1px solid ${COLORS.border}`, textAlign: align,
      textTransform: "uppercase", letterSpacing: 0.3,
    }}>
      {children}
    </th>
  );
}

function Td({ children, yellow, align = "right" }: { children?: React.ReactNode; yellow?: boolean; align?: "left" | "center" | "right" }) {
  return (
    <td style={{
      background: yellow ? COLORS.cellYellow : "transparent",
      padding: "6px 10px", border: `1px solid ${COLORS.border}`, fontSize: 13,
      textAlign: align, color: COLORS.text, fontWeight: yellow ? 700 : 400,
      fontVariantNumeric: "tabular-nums",
    }}>
      {children}
    </td>
  );
}

function ItemRow({ label, value, onChange, readonly, precioEstab, ajustado }: {
  label: string; value: number; onChange: (v: number) => void; readonly: boolean; precioEstab: number; ajustado: number;
}) {
  const pct = precioEstab > 0 ? value / precioEstab : 0;
  return (
    <tr>
      <Td align="left">{label}</Td>
      <Td yellow><Money value={value} onChange={onChange} readonly={readonly} /></Td>
      <Td>{fmtPct0(pct)}</Td>
      <Td>{fmtCOP(value + ajustado)}</Td>
    </tr>
  );
}

function Money({ value, onChange, readonly }: { value: number; onChange: (v: number) => void; readonly: boolean }) {
  if (readonly) return <span>{fmtCOP(value)}</span>;
  return (
    <input
      type="number" step={100} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={cellInputStyle}
    />
  );
}

function Pct({ value, onChange, readonly }: { value: number; onChange: (v: number) => void; readonly: boolean }) {
  if (readonly) return <span>{fmtPct0(value)}</span>;
  return (
    <input
      type="number" step={1} value={Math.round(value * 100)}
      onChange={(e) => onChange((parseFloat(e.target.value) || 0) / 100)}
      style={cellInputStyle}
    />
  );
}

function Int({ value, onChange, readonly }: { value: number; onChange: (v: number) => void; readonly: boolean }) {
  if (readonly) return <span>{fmtInt(value)}</span>;
  return (
    <input
      type="number" step={1} value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      style={cellInputStyle}
    />
  );
}

// ===== Estilos =====

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontVariantNumeric: "tabular-nums",
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "8px 18px",
  borderRadius: 6,
  border: `1px solid ${active ? "#2E7D32" : COLORS.border}`,
  background: active ? "#2E7D32" : "#fff",
  color: active ? "#fff" : "#333",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
});

const dateInputStyle: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 4,
  border: `1px solid ${COLORS.border}`,
  fontSize: 13,
};

const presetBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 4,
  border: `1px solid ${COLORS.border}`,
  background: "#fff",
  fontSize: 11,
  cursor: "pointer",
  fontWeight: 600,
};

const cellInputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  background: "transparent",
  textAlign: "right",
  fontWeight: 700,
  fontSize: 13,
  color: COLORS.text,
  fontVariantNumeric: "tabular-nums",
  fontFamily: "inherit",
};
