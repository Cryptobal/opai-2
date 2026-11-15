"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de gasto recurrente (nuevo / editar / cambiar desde una fecha): se descargan al abrirse (ADR-037).
export const HojaRecurrente = hojaDiferida(["nuevo", "editar"], () =>
  import("./hoja-recurrente").then((m) => m.HojaRecurrente),
);
export const HojaCambio = hojaDiferida(["cambiar"], () => import("./hoja-cambio").then((m) => m.HojaCambio));
