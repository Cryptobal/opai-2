"use client";

import dynamic from "next/dynamic";

/** «Vistas» se descarga aparte y después de pintar: no pesa en el JS inicial de la lista (ADR-037). */
export const VistasDiferidas = dynamic(
  () => import("./vistas-guardadas").then((m) => m.VistasGuardadas),
  { ssr: false },
);
