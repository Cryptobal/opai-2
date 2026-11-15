"use client";

import dynamic from "next/dynamic";

/** «Personalizar» se descarga solo donde aparece (diseño nuevo y quien configura): no pesa en Inicio (ADR-037). */
export const PersonalizarIndicadores = dynamic(() =>
  import("./personalizar-indicadores").then((m) => m.PersonalizarIndicadores),
);
