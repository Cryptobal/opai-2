"use client";

import dynamic from "next/dynamic";

// La sección (buscador, quitar, avisos) se descarga aparte: el Resumen va al ras de su tope de JS
// inicial (ADR-037). El HTML llega igual desde el servidor; el skeleton cubre solo la descarga.
export const SupervisoresACargoDiferido = dynamic(
  () => import("./supervisores-a-cargo").then((m) => m.SupervisoresACargo),
  { loading: () => <div aria-hidden className="ds-shimmer h-40 w-full rounded-lg bg-fill" /> },
);
