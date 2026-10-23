"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojaTrabajo = hojaDiferida(["ver"], () =>
  import("./hoja-trabajo").then((m) => m.HojaTrabajo),
);
