"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojaPatron = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-patron").then((m) => m.HojaPatron),
);

export const HojaFuncion = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-funcion").then((m) => m.HojaFuncion),
);
