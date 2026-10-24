"use client";

import dynamic from "next/dynamic";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de cargos: se descargan al abrirse (ADR-037).
export const HojaCargo = hojaDiferida(["editar", "nuevo"], () =>
  import("./hoja-cargo").then((m) => m.HojaCargo),
);
export const HojaVersion = hojaDiferida(["version"], () =>
  import("./hoja-version").then((m) => m.HojaVersion),
);

// Interruptor de sueldo sensible: se renderiza en el servidor y su JavaScript se descarga aparte
// (ADR-037), fuera del inicial de la ficha.
export const SwitchSensible = dynamic(() =>
  import("./switch-sensible").then((m) => m.SwitchSensible),
);
