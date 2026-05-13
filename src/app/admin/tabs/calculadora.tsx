"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalcInputs,
  DEFAULT_INPUTS,
  calcular,
  fmtCOP,
  fmtInt,
  fmtPct,
} from "./calculadora-logic";

type RealData = {
  rango: { from: string | null; to: string | null };
  pedidos: {
    facturados: number;
    despachados: number;
    entregados: number;
    devueltos: number;
    novedades: number;
  };
  tasas: {
    despachos: number;
    entrega: number;
    devolucion: number;
  };
  unidades: {
    facturadas: number;
    despachadas: number;
  };
  finanzas: {
    facturadoBruto: number;
    entregadoFacturado: number;
    ticketPromedio: number;
    pautaGastada: number;
  };
};

type SubTab = "manual" | "real";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function startOfMonthISO(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return d.toISOString().slice(0, 10);
}
function endOfMonthISO(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return d.toISOString().slice(0, 10);
}

// ===== UI helpers =====

function NumberInput({
  label, value, onChange, suffix, step = 1, isPct = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  isPct?: boolean;
}) {
  const display = isPct ? (value * 100).toFixed(1) : value.toString();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
      <span style={{ color: "#666", fontWeight: 500 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          step={step}
          value={display}
          onChange={(e) => {
            const v = parseFloat(e.target.value) || 0;
            onChange(isPct ? v / 100 : v);
          }}
          style={{
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #d0d4d6",
            background: "#FFF9D6",  // celdas amarillas como el sheet
            fontSize: 14,
            fontWeight: 600,
            width: "100%",
          }}
        />
        {suffix && <span style={{ color: "#888", fontSize: 13 }}>{suffix}</span>}
      </div>
    </label>
  );
}

function ResultRow({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 12px",
        background: highlight ? "#E8F5E9" : "#F9FAFB",
        borderRadius: 6,
        borderLeft: highlight ? "4px solid #2E7D32" : "4px solid #E0E0E0",
      }}
    >
      <span style={{ fontWeight: 500, color: "#444" }}>
        {label}
        {sub && <span style={{ color: "#999", fontSize: 12, marginLeft: 6 }}>{sub}</span>}
      </span>
      <span style={{ fontWeight: 700, color: highlight ? "#2E7D32" : "#222" }}>{value}</span>
    </div>
  );
}

// ===== Componente principal =====

export function Calculadora() {
  const [subtab, setSubtab] = useState<SubTab>("real");

  // Estado de inputs manuales (persisten en localStorage)
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("calc-manual-inputs");
      if (saved) setInputs({ ...DEFAULT_INPUTS, ...JSON.parse(saved) });
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("calc-manual-inputs", JSON.stringify(inputs));
    } catch {}
  }, [inputs]);

  // Estado del tab REAL
  const [from, setFrom] = useState<string>(isoDaysAgo(7));
  const [to, setTo] = useState<string>(todayISO());
  const [realData, setRealData] = useState<RealData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Overrides editables en el tab real (precio, costos, pauta override)
  const [realOverrides, setRealOverrides] = useState({
    precioEstablecido: 89900,
    costoProducto: 12000,
    costoFleteProm: 16000,
    costoAdministrativo: 0,
    pautaManual: 0, // si > 0, sobreescribe la pauta de Meta
  });

  async function cargarReal() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/admin/calculadora?from=${from}&to=${to}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as RealData;
      setRealData(data);
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

  // Cálculo MANUAL
  const resultsManual = useMemo(() => calcular(inputs), [inputs]);

  // Cálculo REAL — usa datos del API + overrides editables
  const realInputs: CalcInputs | null = useMemo(() => {
    if (!realData) return null;
    return {
      precioEstablecido: realOverrides.precioEstablecido,
      costoProducto: realOverrides.costoProducto,
      costoFleteProm: realOverrides.costoFleteProm,
      costoAdministrativo: realOverrides.costoAdministrativo,
      pedidosFacturados: realData.pedidos.facturados,
      unidadesFacturadas: realData.unidades.facturadas,
      tasaDespachos: realData.tasas.despachos,
      tasaDevolucion: realData.tasas.devolucion,
      pautaGastada: realOverrides.pautaManual > 0 ? realOverrides.pautaManual : realData.finanzas.pautaGastada,
    };
  }, [realData, realOverrides]);
  const resultsReal = useMemo(() => realInputs ? calcular(realInputs) : null, [realInputs]);

  // ====== Render ======

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>Calculadora de unit economics</h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setSubtab("real")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #cfd4d8",
              background: subtab === "real" ? "#2E7D32" : "#fff",
              color: subtab === "real" ? "#fff" : "#333",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tiempo real
          </button>
          <button
            onClick={() => setSubtab("manual")}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #cfd4d8",
              background: subtab === "manual" ? "#2E7D32" : "#fff",
              color: subtab === "manual" ? "#fff" : "#333",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Manual
          </button>
        </div>
      </div>

      {subtab === "manual" && (
        <ManualPanel inputs={inputs} setInputs={setInputs} results={resultsManual} />
      )}

      {subtab === "real" && (
        <RealPanel
          from={from} to={to} setFrom={setFrom} setTo={setTo}
          loading={loading} err={err} realData={realData} realInputs={realInputs} results={resultsReal}
          overrides={realOverrides} setOverrides={setRealOverrides}
          reload={cargarReal}
        />
      )}
    </div>
  );
}

// ===== Panel MANUAL =====

function ManualPanel({ inputs, setInputs, results }: { inputs: CalcInputs; setInputs: (v: CalcInputs) => void; results: ReturnType<typeof calcular> }) {
  const upd = (patch: Partial<CalcInputs>) => setInputs({ ...inputs, ...patch });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div>
        <h3 style={{ fontSize: 14, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Variables (amarillo = editable)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <NumberInput label="Precio establecido" value={inputs.precioEstablecido} onChange={(v) => upd({ precioEstablecido: v })} suffix="COP" step={100} />
          <NumberInput label="Costo producto" value={inputs.costoProducto} onChange={(v) => upd({ costoProducto: v })} suffix="COP" step={100} />
          <NumberInput label="Flete promedio" value={inputs.costoFleteProm} onChange={(v) => upd({ costoFleteProm: v })} suffix="COP" step={100} />
          <NumberInput label="Admin / pedido" value={inputs.costoAdministrativo} onChange={(v) => upd({ costoAdministrativo: v })} suffix="COP" step={100} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          <NumberInput label="Pedidos facturados" value={inputs.pedidosFacturados} onChange={(v) => upd({ pedidosFacturados: v })} />
          <NumberInput label="Unidades facturadas" value={inputs.unidadesFacturadas} onChange={(v) => upd({ unidadesFacturadas: v })} />
          <NumberInput label="Tasa despachos" value={inputs.tasaDespachos} onChange={(v) => upd({ tasaDespachos: v })} isPct suffix="%" step={1} />
          <NumberInput label="Tasa devolución" value={inputs.tasaDevolucion} onChange={(v) => upd({ tasaDevolucion: v })} isPct suffix="%" step={1} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <NumberInput label="Pauta gastada (período)" value={inputs.pautaGastada} onChange={(v) => upd({ pautaGastada: v })} suffix="COP" step={50000} />
        </div>
      </div>

      <ResultadosPanel results={results} inputs={inputs} />
    </div>
  );
}

// ===== Panel TIEMPO REAL =====

function RealPanel({
  from, to, setFrom, setTo, loading, err, realData, realInputs, results, overrides, setOverrides, reload,
}: {
  from: string; to: string;
  setFrom: (s: string) => void; setTo: (s: string) => void;
  loading: boolean; err: string | null;
  realData: RealData | null;
  realInputs: CalcInputs | null;
  results: ReturnType<typeof calcular> | null;
  overrides: { precioEstablecido: number; costoProducto: number; costoFleteProm: number; costoAdministrativo: number; pautaManual: number };
  setOverrides: (v: typeof overrides) => void;
  reload: () => void;
}) {
  const updOv = (patch: Partial<typeof overrides>) => setOverrides({ ...overrides, ...patch });
  const presets = [
    { label: "Hoy", from: todayISO(), to: todayISO() },
    { label: "Últimos 7d", from: isoDaysAgo(7), to: todayISO() },
    { label: "Últimos 30d", from: isoDaysAgo(30), to: todayISO() },
    { label: "Este mes", from: startOfMonthISO(0), to: todayISO() },
    { label: "Mes pasado", from: startOfMonthISO(-1), to: endOfMonthISO(-1) },
  ];

  return (
    <div>
      {/* Selector de rango */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          Desde:
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: "6px 8px", borderRadius: 5, border: "1px solid #cfd4d8" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          Hasta:
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: "6px 8px", borderRadius: 5, border: "1px solid #cfd4d8" }} />
        </label>
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          {presets.map((p) => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }}
              style={{ padding: "6px 10px", borderRadius: 5, border: "1px solid #cfd4d8", background: "#fff", fontSize: 12, cursor: "pointer" }}>
              {p.label}
            </button>
          ))}
        </div>
        <button onClick={reload} disabled={loading}
          style={{ padding: "7px 14px", borderRadius: 5, border: "none", background: "#2E7D32", color: "#fff", fontWeight: 600, cursor: "pointer", marginLeft: "auto" }}>
          {loading ? "Cargando…" : "Refrescar"}
        </button>
      </div>

      {err && <div style={{ background: "#FFEBEE", color: "#C62828", padding: 10, borderRadius: 6, marginBottom: 14 }}>Error: {err}</div>}

      {!realData ? <div style={{ color: "#888", padding: 20 }}>Cargando datos…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            {/* Métricas reales (no editables, de DB) */}
            <h3 style={{ fontSize: 14, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Datos del período (de DB y Meta)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
              <DataBox label="Pedidos facturados" value={fmtInt(realData.pedidos.facturados)} />
              <DataBox label="Pedidos despachados" value={fmtInt(realData.pedidos.despachados)} sub={`${fmtPct(realData.tasas.despachos)}`} />
              <DataBox label="Entregados" value={fmtInt(realData.pedidos.entregados)} sub={`${fmtPct(realData.tasas.entrega)} de despachados`} />
              <DataBox label="Devoluciones / cancel" value={fmtInt(realData.pedidos.devueltos)} sub={`${fmtPct(realData.tasas.devolucion)}`} />
              <DataBox label="Novedades activas" value={fmtInt(realData.pedidos.novedades)} />
              <DataBox label="Unidades facturadas" value={fmtInt(realData.unidades.facturadas)} />
              <DataBox label="Facturado bruto" value={fmtCOP(realData.finanzas.facturadoBruto)} />
              <DataBox label="Ticket promedio" value={fmtCOP(realData.finanzas.ticketPromedio)} />
              <DataBox label="Pauta gastada (Meta)" value={fmtCOP(realData.finanzas.pautaGastada)} sub={realData.finanzas.pautaGastada === 0 ? "API no devolvió" : ""} />
            </div>

            {/* Overrides editables */}
            <h3 style={{ fontSize: 14, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
              Costos del modelo (editables)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <NumberInput label="Precio establecido" value={overrides.precioEstablecido} onChange={(v) => updOv({ precioEstablecido: v })} suffix="COP" step={100} />
              <NumberInput label="Costo producto" value={overrides.costoProducto} onChange={(v) => updOv({ costoProducto: v })} suffix="COP" step={100} />
              <NumberInput label="Flete promedio" value={overrides.costoFleteProm} onChange={(v) => updOv({ costoFleteProm: v })} suffix="COP" step={100} />
              <NumberInput label="Admin / pedido" value={overrides.costoAdministrativo} onChange={(v) => updOv({ costoAdministrativo: v })} suffix="COP" step={100} />
              <NumberInput label="Pauta override (0 = usar Meta)" value={overrides.pautaManual} onChange={(v) => updOv({ pautaManual: v })} suffix="COP" step={50000} />
            </div>
          </div>

          {results && realInputs && <ResultadosPanel results={results} inputs={realInputs} />}
        </div>
      )}
    </div>
  );
}

function DataBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#F1F3F4", borderRadius: 6, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#222" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#888" }}>{sub}</div>}
    </div>
  );
}

// ===== Panel de RESULTADOS (compartido) =====

function ResultadosPanel({ results, inputs }: { results: ReturnType<typeof calcular>; inputs: CalcInputs }) {
  return (
    <div>
      <h3 style={{ fontSize: 14, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
        Resultados
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ResultRow label="Pedidos despachados" value={fmtInt(results.pedidosDespachados)} sub={`× ${fmtPct(inputs.tasaDespachos)}`} />
        <ResultRow label="Pedidos entregados" value={fmtInt(results.pedidosEntregados)} sub={`× ${fmtPct(1 - inputs.tasaDevolucion)}`} />
        <ResultRow label="Pedidos devueltos" value={fmtInt(results.pedidosDevueltos)} />

        <div style={{ height: 8 }} />
        <ResultRow label="Facturado bruto" value={fmtCOP(results.facturadoBruto)} />
        <ResultRow label="Facturado entregado" value={fmtCOP(results.facturadoEntregado)} sub="ingreso real" />

        <div style={{ height: 8 }} />
        <ResultRow label="Costo producto" value={fmtCOP(results.costoProductoTotal)} />
        <ResultRow label="Costo flete" value={fmtCOP(results.costoFleteTotal)} sub="incluye devoluciones" />
        <ResultRow label="Costo pauta" value={fmtCOP(results.costoPauta)} />
        {results.costoAdminTotal > 0 && <ResultRow label="Costo admin" value={fmtCOP(results.costoAdminTotal)} />}
        <ResultRow label="Costos totales" value={fmtCOP(results.costosTotales)} />

        <div style={{ height: 8 }} />
        <ResultRow label="Utilidad neta" value={fmtCOP(results.utilidadNeta)} highlight />
        <ResultRow label="Margen neto" value={fmtPct(results.margenNeto)} highlight />
        <ResultRow label="Utilidad por pedido facturado" value={fmtCOP(results.utilidadPorPedido)} />

        <div style={{ height: 8 }} />
        <ResultRow label="CPA calculado" value={fmtCOP(results.cpaCalculado)} sub="pauta / entregados" />
        <ResultRow label="CPA break-even" value={fmtCOP(results.cpaBreakEven)} sub="máximo sostenible por entrega" />
        <ResultRow label="ROAS" value={`${results.roas.toFixed(2)}x`} />
      </div>
    </div>
  );
}
