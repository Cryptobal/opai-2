"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// El detalle de una visita se descarga solo al abrirse por `?visita=` (ADR-037).
export const HojaVisita = hojaDiferida(["visita"], () =>
  import("./hoja-visita").then((m) => m.HojaVisita),
);
