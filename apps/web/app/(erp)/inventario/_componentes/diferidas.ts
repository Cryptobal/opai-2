"use client";

import dynamic from "next/dynamic";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de tipos, activos y ropa, y botón de sugeridos: se descargan al usarse (ADR-037).
export const HojaTipo = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-tipo").then((m) => m.HojaTipo),
);
export const HojaActivo = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-activo").then((m) => m.HojaActivo),
);
export const HojaIngresoRopa = hojaDiferida(["ingreso"], () =>
  import("./hoja-ingreso-ropa").then((m) => m.HojaIngresoRopa),
);
export const HojaAjusteRopa = hojaDiferida(["ajustar"], () =>
  import("./hoja-ajuste-ropa").then((m) => m.HojaAjusteRopa),
);
export const CargarSugeridos = dynamic(() =>
  import("./cargar-sugeridos").then((m) => m.CargarSugeridos),
);
