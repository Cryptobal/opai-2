"use client";

import dynamic from "next/dynamic";

/** Lista de vínculos cuenta–contacto: chunk aparte del inicial de la ficha (ADR-037). */
export const ListaVinculosDiferida = dynamic(() =>
  import("./lista-vinculos").then((m) => m.ListaVinculos),
);
