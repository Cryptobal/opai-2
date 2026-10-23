"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojasUsuario = hojaDiferida(["invitar", "editar"], () =>
  import("./hojas-usuario").then((m) => m.HojasUsuario),
);
