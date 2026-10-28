"use client";

import dynamic from "next/dynamic";

// Los chips (ChipToggle, estado por URL) se descargan aparte: la lista se ve con su HTML y no suman
// al JS inicial de la pestaña Puestos, que va al ras de su tope (ADR-037).
export const ChipsPuestosDiferido = dynamic(
  () => import("./chips-puestos").then((m) => m.ChipsPuestos),
  { loading: () => <div aria-hidden className="h-11 md:h-8" /> },
);
