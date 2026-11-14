"use client";

import dynamic from "next/dynamic";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de tipos y activos, y botón de sugeridos: se descargan al usarse (ADR-037).
export const HojaTipo = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-tipo").then((m) => m.HojaTipo),
);
export const HojaActivo = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-activo").then((m) => m.HojaActivo),
);
export const CargarSugeridos = dynamic(() =>
  import("./cargar-sugeridos").then((m) => m.CargarSugeridos),
);
