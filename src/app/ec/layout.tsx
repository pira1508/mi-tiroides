import type { Metadata } from "next";

// /ec — MI TIROIDES para Ecuador (11-nov-2026). Ruta sin enlaces desde las
// landings de Colombia; noindex mientras se valida el mercado.
export const metadata: Metadata = {
  title: "MI TIROIDES · Ecuador",
  description:
    "Suplemento alimenticio con selenio, zinc, L-tirosina, yodo, B12 y D3. Va con su pastilla, no la reemplaza. Pago contra entrega en todo Ecuador.",
  robots: { index: false, follow: false },
};

export default function EcLayout({ children }: { children: React.ReactNode }) {
  return children;
}
