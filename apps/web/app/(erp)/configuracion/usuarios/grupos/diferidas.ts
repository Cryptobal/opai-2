"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojasGrupo = hojaDiferida(["grupo", "nuevo"], () =>
  import("./hojas-grupo").then((m) => m.HojasGrupo),
);
