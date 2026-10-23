import type { Capacidad } from "../../types";
import { empresaGet, empresaUpdate } from "./empresa";
import { marcaGet, marcaUpdate } from "./marca";

export const capacidadesEmpresa: readonly Capacidad[] = [
  empresaGet,
  empresaUpdate,
  marcaGet,
  marcaUpdate,
];
