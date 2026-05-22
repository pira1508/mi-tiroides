"use client";

// Captura los parámetros de tracking de la URL al cargar la landing y los
// persiste en sessionStorage para que sobrevivan navegación entre /, /v2,
// /quiz, etc. Al enviar el pedido se leen y viajan al bot.

import { useEffect } from "react";

const KEY = "mit_tracking";

export type TrackingPayload = {
  fbclid?: string;
  ttclid?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  referrer?: string;
};

export function capturarTracking() {
  if (typeof window === "undefined") return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const datos: TrackingPayload = {};
    const fbclid = sp.get("fbclid"); if (fbclid) datos.fbclid = fbclid;
    const ttclid = sp.get("ttclid"); if (ttclid) datos.ttclid = ttclid;
    const utm_source = sp.get("utm_source"); if (utm_source) datos.utm_source = utm_source;
    const utm_campaign = sp.get("utm_campaign"); if (utm_campaign) datos.utm_campaign = utm_campaign;
    const utm_medium = sp.get("utm_medium"); if (utm_medium) datos.utm_medium = utm_medium;

    // Solo guardar si trae algo. No pisar lo previo si la nueva URL es "limpia"
    // (típico: el usuario llegó con ?fbclid=xx, navegó a /quiz sin params,
    //  y volvió a /v2 sin params — queremos preservar el fbclid original).
    if (Object.keys(datos).length === 0) return;

    // Referrer solo si es de fuera del sitio
    try {
      const ref = document.referrer;
      if (ref && !ref.includes(window.location.host)) datos.referrer = new URL(ref).host;
    } catch {}

    sessionStorage.setItem(KEY, JSON.stringify(datos));
  } catch {}
}

export function leerTracking(): TrackingPayload {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TrackingPayload;
  } catch {
    return {};
  }
}

export function useCapturarTrackingOnMount() {
  useEffect(() => {
    capturarTracking();
  }, []);
}
