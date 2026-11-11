import type { Capacidad } from "../../types";
import { empresaActividadesCatalogo, empresaActividadesGet, empresaActividadesSet } from "./actividades";
import { empresaGet, empresaUpdate } from "./empresa";
import { marcaGet, marcaUpdate } from "./marca";

export const capacidadesEmpresa: readonly Capacidad[] = [
  empresaGet,
  empresaUpdate,
  empresaActividadesGet,
  empresaActividadesSet,
  empresaActividadesCatalogo,
  marcaGet,
  marcaUpdate,
];
