"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojaTipo = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-tipo").then((m) => m.HojaTipo),
);
