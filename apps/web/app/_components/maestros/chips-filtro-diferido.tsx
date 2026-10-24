"use client";

import dynamic from "next/dynamic";

// Los chips (menús Radix) se descargan aparte: la lista se ve con su HTML y no suma al JS inicial
// de cada ruta que la incluye, que ahora son todas las pestañas de la ficha (ADR-037).
export const ChipsFiltroDiferido = dynamic(
  () => import("./chips-filtro").then((m) => m.ChipsFiltro),
  {
    loading: () => <div aria-hidden className="h-11 md:h-8" />,
  },
);
