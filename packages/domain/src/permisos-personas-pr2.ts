import { PERMISOS_CORE } from "./permisos-catalogo";

/** Denegaciones PR 2 (Personas y Cargos) por rol, importadas en permisos.ts para no superar max-lines. */
export const DENEGAR_GERENTE_PERSONAS_PR2 = [
  PERMISOS_CORE.personasPrevisionRead,
  PERMISOS_CORE.personasPrevisionManage,
  PERMISOS_CORE.personasPagoRead,
  PERMISOS_CORE.personasPagoManage,
  PERMISOS_CORE.personasPagoAprobar,
  PERMISOS_CORE.personasLaboralManage,
] as const;

export const PERMITIR_SUPERVISOR_PERSONAS_PR2 = [
  PERMISOS_CORE.personasPrevisionRead,
  PERMISOS_CORE.personasPagoRead,
  PERMISOS_CORE.personasLaboralRead,
] as const;

export const DENEGAR_VIEWER_PERSONAS_PR2 = [
  PERMISOS_CORE.personasPrevisionRead,
  PERMISOS_CORE.personasPrevisionManage,
  PERMISOS_CORE.personasPagoRead,
  PERMISOS_CORE.personasPagoManage,
  PERMISOS_CORE.personasPagoAprobar,
  PERMISOS_CORE.personasLaboralRead,
  PERMISOS_CORE.personasLaboralManage,
] as const;
