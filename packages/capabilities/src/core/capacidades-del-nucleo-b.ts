import type { Capacidad } from "../types";
import { capacidadesPlataforma } from "./plataforma";
import { capacidadesTurnos } from "./turnos";

/** Cierre del registro `core.*` / `platform.*`. */
export const capacidadesDelNucleoB: readonly Capacidad[] = [
  ...capacidadesTurnos,
  ...capacidadesPlataforma,
];