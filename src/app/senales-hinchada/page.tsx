import type { Metadata } from "next";
import SenalesPage from "../senales/senales-page";
import { CONFIG_HINCHAZON } from "../senales/configs";

export const metadata: Metadata = {
  title: "Se toma su pastilla juiciosa y aun así amanece hinchada | MI TIROIDES",
  description: "Pago contra entrega · envío a toda Colombia · garantía de 90 días.",
};

export default function Page() {
  return <SenalesPage config={CONFIG_HINCHAZON} />;
}
