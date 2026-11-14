"use client";

import { hojaDiferida } from "@/app/_components/hoja-diferida";

// Hojas que solo usa la pestaña Laboral (ADR-037): en un módulo aparte para que las demás rutas de la ficha no
// carguen su código.

// Períodos del contrato (CAR-409): registrar y anular comparten módulo (una sola carga diferida).
export const HojasPeriodoContrato = hojaDiferida(["registrar-periodo", "anular-periodo"], () =>
  import("./hojas-periodo-contrato").then((m) => m.HojasPeriodoContrato),
);

// Tallas por prenda del uniforme (CAR-408).
export const HojaTallas = hojaDiferida(["editar-tallas"], () =>
  import("./hoja-tallas").then((m) => m.HojaTallas),
);
