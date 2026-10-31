"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hoja de proveedor (nuevo / editar): se descarga al abrirse (ADR-037).
export const HojaProveedor = hojaDiferida(["nuevo", "editar"], () =>
  import("./hoja-proveedor").then((m) => m.HojaProveedor),
);
