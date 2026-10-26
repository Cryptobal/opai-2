import type { Capacidad } from "../../types";
import { cumplimientoDpaAceptar, cumplimientoEstado } from "./dpa";
import { cumplimientoDpoSet } from "./dpo";

/** Capacidades de cumplimiento (Ley 21.719, Brief 07d). PR 1: DPA, DPO y RAT. */
export const capacidadesCumplimiento: readonly Capacidad[] = [
  cumplimientoEstado,
  cumplimientoDpaAceptar,
  cumplimientoDpoSet,
];
