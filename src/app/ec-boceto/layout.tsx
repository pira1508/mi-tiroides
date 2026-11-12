import type { Metadata } from "next";

// /ec-boceto — BOCETO INTERNO de /ec (testimonios de ejemplo, NO recibe tráfico de anuncios) (11-nov-2026). Ruta sin enlaces desde las
// landings de Colombia; noindex mientras se valida el mercado.
export const metadata: Metadata = {
  title: "BOCETO · MI TIROIDES Ecuador",
  description:
    "Suplemento alimenticio con selenio, zinc, L-tirosina, yodo, B12 y D3. Va con su pastilla, no la reemplaza. Pago contra entrega en todo Ecuador.",
  robots: { index: false, follow: false },
};

export default function EcBocetoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
