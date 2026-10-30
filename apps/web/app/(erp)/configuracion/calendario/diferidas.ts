"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

/** La hoja de agregar/editar día solo se descarga cuando `?nuevo` o `?editar` están en la URL (ADR-037). */
export const HojaDia = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-dia").then((m) => m.HojaDia),
);
