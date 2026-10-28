"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const DialogoDpa = hojaDiferida(["dpa"], () =>
  import("./dialogo-dpa").then((m) => m.DialogoDpa),
);
export const HojaDpo = hojaDiferida(["dpo"], () => import("./hoja-dpo").then((m) => m.HojaDpo));
export const HojaIncidente = hojaDiferida(["nuevo"], () =>
  import("./hoja-incidente").then((m) => m.HojaIncidente),
);
