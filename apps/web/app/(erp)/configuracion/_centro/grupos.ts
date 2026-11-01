import { Blocks, Bot, Building2, CalendarClock, Gauge, Users, type LucideIcon } from "lucide-react";

/**
 * Grupos cerrados del centro de Configuración (REGLA §1.2, ADR-018/038). Único lugar donde viven la
 * etiqueta, el ícono, la línea corta y el orden de cada grupo: la portada, la lista del grupo y el
 * buscador lo leen de aquí. La lista es cerrada (máx. 6); crear o dividir un grupo lo decide Carlos.
 */
export type GrupoId =
  | "empresa"
  | "operacion"
  | "personas-acceso"
  | "agentes"
  | "modulos"
  | "uso-registros";

export type Grupo = {
  id: GrupoId;
  etiqueta: string;
  /** Línea corta de la tarjeta («Patrones, feriados y documentos»). */
  corta: string;
  icono: LucideIcon;
};

export const GRUPOS: readonly Grupo[] = [
  {
    id: "empresa",
    etiqueta: "Empresa",
    corta: "Datos, marca, personas y avisos",
    icono: Building2,
  },
  {
    id: "operacion",
    etiqueta: "Operación",
    corta: "Patrones, feriados y documentos",
    icono: CalendarClock,
  },
  {
    id: "personas-acceso",
    etiqueta: "Personas y acceso",
    corta: "Usuarios, roles y portales",
    icono: Users,
  },
  {
    id: "agentes",
    etiqueta: "Agentes",
    corta: "Keys, autonomía y aprobaciones",
    icono: Bot,
  },
  {
    id: "modulos",
    etiqueta: "Módulos",
    corta: "Catálogo y ajustes por módulo",
    icono: Blocks,
  },
  {
    id: "uso-registros",
    etiqueta: "Uso y registros",
    corta: "Integraciones, consumos y auditoría",
    icono: Gauge,
  },
];

/** Ids válidos de grupo, para el 404 de `/configuracion/grupo/<id>` y el test de la regla. */
export const GRUPOS_IDS: readonly GrupoId[] = GRUPOS.map((g) => g.id);

/** Metadata de un grupo por su id (undefined si el id no existe). */
export const grupoPorId = (id: string): Grupo | undefined => GRUPOS.find((g) => g.id === id);
