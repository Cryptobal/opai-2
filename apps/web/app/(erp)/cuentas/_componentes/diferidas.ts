"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de cuentas: se descargan al abrirse (ADR-037).
export const HojaCuenta = hojaDiferida(["editar", "nueva"], () =>
  import("./hoja-cuenta").then((m) => m.HojaCuenta),
);
export const HojaContacto = hojaDiferida(["contacto"], () =>
  import("./hoja-contacto").then((m) => m.HojaContacto),
);
export const HojaSii = hojaDiferida(["sii"], () => import("./hoja-sii").then((m) => m.HojaSii));
