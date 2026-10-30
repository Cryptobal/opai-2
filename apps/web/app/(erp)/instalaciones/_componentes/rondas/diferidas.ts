"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Drawers de Rondas: se descargan solo al abrirse por su parámetro de URL, para no pesar en el JS
// inicial de la pestaña (ADR-037).
export const HojaPunto = hojaDiferida(["punto"], () =>
  import("./hoja-punto").then((m) => m.HojaPunto),
);
export const HojaPlantilla = hojaDiferida(["plantilla"], () =>
  import("./hoja-plantilla").then((m) => m.HojaPlantilla),
);
export const HojaProgramacion = hojaDiferida(["programacion"], () =>
  import("./hoja-programacion").then((m) => m.HojaProgramacion),
);
