"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de cargos: se descargan al abrirse (ADR-037).
export const HojaCargo = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-cargo").then((m) => m.HojaCargo),
);
export const HojaVersion = hojaDiferida(["version"], () =>
  import("./hoja-version").then((m) => m.HojaVersion),
);
