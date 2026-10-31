"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hoja de edición en la ficha: se descarga al abrirse con `?editar=1` (ADR-037).
export const HojaProveedorDiferida = hojaDiferida(["editar"], () =>
  import("./hoja-proveedor").then((m) => m.HojaProveedor),
);
