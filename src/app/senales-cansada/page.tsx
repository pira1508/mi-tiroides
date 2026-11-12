import type { Metadata } from "next";
import SenalesPage from "../senales/senales-page";
import { CONFIG_CANSANCIO } from "../senales/configs";

export const metadata: Metadata = {
  title: "Duerme 8 horas y aun así amanece agotada | MI TIROIDES",
  description: "Pago contra entrega · envío a toda Colombia · garantía de 90 días.",
};

export default function Page() {
  return <SenalesPage config={CONFIG_CANSANCIO} />;
}
