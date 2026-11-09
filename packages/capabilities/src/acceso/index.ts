// Capacidades de Control de acceso (CAR-78 · E4). Se exponen igual en UI, API /api/v1 y MCP (ADR-004, ADR-055).
import type { Capacidad } from "../types";
import { listasAgregar, listasListar, listasQuitar } from "./listas";
import { registrosListar } from "./registros";

export const capacidadesAcceso: readonly Capacidad[] = [
  listasListar,
  listasAgregar,
  listasQuitar,
  registrosListar,
];
