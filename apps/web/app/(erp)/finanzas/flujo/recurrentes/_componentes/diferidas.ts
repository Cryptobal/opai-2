"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hoja de gasto recurrente (nuevo / editar): se descarga al abrirse (ADR-037).
export const HojaRecurrente = hojaDiferida(["nuevo", "editar"], () =>
  import("./hoja-recurrente").then((m) => m.HojaRecurrente),
);
