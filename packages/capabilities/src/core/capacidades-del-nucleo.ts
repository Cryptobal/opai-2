import type { Capacidad } from "../types";
import { capacidadesDelNucleoA } from "./capacidades-del-nucleo-a";
import { capacidadesDelNucleoB } from "./capacidades-del-nucleo-b";
import { capacidadesDelNucleoC } from "./capacidades-del-nucleo-c";

/** Capacidades del núcleo (`core.*`) y de plataforma (`platform.*`), Brief 01 sección 7. */
export const capacidadesDelNucleo: readonly Capacidad[] = [
  ...capacidadesDelNucleoA,
  ...capacidadesDelNucleoC,
  ...capacidadesDelNucleoB,
];