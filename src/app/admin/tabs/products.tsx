"use client";

const PRODUCTS = [
  {
    id: "tir-1f",
    name: "MI TIROIDES · 1 frasco",
    sku: "MTI-1F",
    priceA: 89900,
    priceB: 89900,
    stock: 312,
    vendidos30d: 18,
    alerta: false,
  },
  {
    id: "tir-2f",
    name: "MI TIROIDES · 2 frascos",
    sku: "MTI-2F",
    priceA: 119900,
    priceB: 139900,
    stock: 184,
    vendidos30d: 9,
    alerta: false,
  },
  {
    id: "tir-3f",
    name: "MI TIROIDES · 3 frascos",
    sku: "MTI-3F",
    priceA: 139900,
    priceB: 169900,
    stock: 96,
    vendidos30d: 5,
    alerta: true,
  },
];

function fmtCOP(n: number) {
  return "$" + n.toLocaleString("es-CO");
}

export function Products() {
  const totalStock = PRODUCTS.reduce((a, p) => a + p.stock, 0);
  const totalVendidos = PRODUCTS.reduce((a, p) => a + p.vendidos30d, 0);

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <div className="kpi">
          <div className="kpi-label">SKUs</div>
          <div className="kpi-value">{PRODUCTS.length}</div>
          <div className="kpi-foot">activos</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Stock total</div>
          <div className="kpi-value num">{totalStock}</div>
          <div className="kpi-foot">unidades</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Vendidos 30d</div>
          <div className="kpi-value num">{totalVendidos}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Alertas</div>
          <div className="kpi-value" style={{ color: "var(--danger)" }}>
            {PRODUCTS.filter((p) => p.alerta).length}
          </div>
          <div className="kpi-foot">stock bajo</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="h2">Catálogo</div>
        </div>
        <div className="card-body tight" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th className="t-right">Precio A</th>
                <th className="t-right">Precio B</th>
                <th className="t-right">Stock</th>
                <th className="t-right">Vendidos 30d</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((p) => (
                <tr key={p.id} className="row-clickable">
                  <td className="mono" style={{ fontSize: 11 }}>{p.sku}</td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td className="t-right num">{fmtCOP(p.priceA)}</td>
                  <td className="t-right num">
                    {fmtCOP(p.priceB)}
                    {p.priceB > p.priceA && (
                      <span className="pill accent" style={{ marginLeft: 6, fontSize: 10 }}>
                        +{Math.round(((p.priceB - p.priceA) / p.priceA) * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="t-right num">{p.stock}</td>
                  <td className="t-right num">{p.vendidos30d}</td>
                  <td>
                    {p.alerta ? (
                      <span className="pill danger">stock bajo</span>
                    ) : (
                      <span className="pill success">activo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
