"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas de Solicitudes: se descargan al abrirse por su parámetro (ADR-037).
export const HojaRegistrar = hojaDiferida(["nueva"], () =>
  import("./hoja-registrar").then((m) => m.HojaRegistrar),
);
export const HojaConvertir = hojaDiferida(["convertir"], () =>
  import("./hoja-convertir").then((m) => m.HojaConvertir),
);
