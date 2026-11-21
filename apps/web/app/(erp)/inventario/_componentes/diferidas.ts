"use client";

import dynamic from "next/dynamic";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de tipos, activos, ropa y entregas, y botón de sugeridos: se descargan al usarse (ADR-037).
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
export const HojaEntrega = hojaDiferida(["nueva"], () =>
  import("./hoja-entrega").then((m) => m.HojaEntrega),
);
export const HojaDevolver = hojaDiferida(["devolver"], () =>
  import("./hoja-devolver").then((m) => m.HojaDevolver),
);
export const CargarSugeridos = dynamic(() =>
  import("./cargar-sugeridos").then((m) => m.CargarSugeridos),
);
