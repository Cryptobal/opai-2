import type { Capacidad } from "../../types";
import { cargosSetJefatura } from "./cargos-jefatura";
import { personasACargoList } from "./personas-a-cargo";
import { personasAsignarJefe } from "./personas-jefe";

export { equipoDe, personaDelUsuario, type Equipo } from "./datos";

/** Jefatura por cargo y personas a cargo (CAR-314, ADR-094). */
export const capacidadesJefatura: readonly Capacidad[] = [
  cargosSetJefatura,
  personasAsignarJefe,
  personasACargoList,
];
