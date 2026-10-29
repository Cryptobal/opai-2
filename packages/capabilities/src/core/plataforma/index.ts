import type { Capacidad } from "../../types";
import { platformAuditoriaList } from "./auditoria-lista";
import { platformPreciosList, platformPreciosSet } from "./precios";
import { platformTenantPanel } from "./tenant-panel";
import { platformUsersList, platformUsersSetRole } from "./usuarios";

export { platformTenantsList } from "./tenants-lista";
export { platformTrabajosList } from "./trabajos-lista";

/**
 * Capacidades de las pantallas de Plataforma (sesión C): panel por empresa y precios; y los
 * usuarios de plataforma (ADR-055) y la auditoría de plataforma (CAR-36), por ahora solo API y MCP:
 * sus pantallas esperan diseño.
 */
export const capacidadesPlataforma: readonly Capacidad[] = [
  platformTenantPanel,
  platformPreciosList,
  platformPreciosSet,
  platformUsersList,
  platformUsersSetRole,
  platformAuditoriaList,
];
