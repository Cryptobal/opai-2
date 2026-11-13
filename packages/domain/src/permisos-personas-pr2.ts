import { PERMISOS_CORE } from "./permisos-catalogo";

/** Permisos PR 2 (Personas y Cargos) del supervisor, importados en permisos-patrones.ts. */
export const PERMITIR_SUPERVISOR_PERSONAS_PR2 = [
  PERMISOS_CORE.personasPrevisionRead,
  PERMISOS_CORE.personasPagoRead,
  PERMISOS_CORE.personasLaboralRead,
] as const;
