"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hoja de cuenta (nueva / editar): se descarga al abrirse (ADR-037).
export const HojaCuenta = hojaDiferida(["nueva", "editar"], () =>
  import("./hoja-cuenta").then((m) => m.HojaCuenta),
);
