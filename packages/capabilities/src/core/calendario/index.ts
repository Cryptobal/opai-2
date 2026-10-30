import type { Capacidad } from "../../types";
import { calendarioActualizar, calendarioArchivar, calendarioCrearFeriado } from "./escritura";
import { calendarioListar } from "./listar";

/** Capacidades del calendario hábil y feriados del Núcleo (CAR-79, ADR-018). */
export const capacidadesCalendario: readonly Capacidad[] = [
  calendarioListar,
  calendarioCrearFeriado,
  calendarioActualizar,
  calendarioArchivar,
];
