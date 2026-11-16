import type { Resultado } from "@opai/capabilities";

import type { Referencia } from "./referencias";

export type Paso = {
  capacidad: string;
  argumentos: unknown;
  clave: string;
  vistaPrevia: Resultado;
};

export type Plan = {
  id: string;
  pasos: Paso[];
  texto: string;
  tokens: number;
  /** Entidades con href interno salidas de las capacidades del turno (CAR-446). */
  referencias: Referencia[];
};
