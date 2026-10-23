"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojaEvento = hojaDiferida(["ver"], () =>
  import("./hoja-evento").then((m) => m.HojaEvento),
);
