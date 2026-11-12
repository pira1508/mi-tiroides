import type { Metadata } from "next";
import SenalesPage from "../senales/senales-page";
import { CONFIG_UNAS } from "../senales/configs";

export const metadata: Metadata = {
  title: "Se toma su pastilla y aun así las uñas se le parten | MI TIROIDES",
  description: "Pago contra entrega · envío a toda Colombia · garantía de 90 días.",
};

export default function Page() {
  return <SenalesPage config={CONFIG_UNAS} />;
}
