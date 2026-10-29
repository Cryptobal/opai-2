"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojasRol = hojaDiferida(["rol", "nuevo"], () =>
  import("./hojas-rol").then((m) => m.HojasRol),
);
