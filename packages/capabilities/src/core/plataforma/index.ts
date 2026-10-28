import type { Capacidad } from "../../types";
import { platformPreciosList, platformPreciosSet } from "./precios";
import { platformTenantPanel } from "./tenant-panel";
import { platformUsersList, platformUsersSetRole } from "./usuarios";

export { platformTenantsList } from "./tenants-lista";
export { platformTrabajosList } from "./trabajos-lista";

/**
 * Capacidades de las pantallas de Plataforma (sesión C): panel por empresa y precios; y los
 * usuarios de plataforma (ADR-055, por ahora solo API y MCP: su pantalla espera diseño).
 */
export const capacidadesPlataforma: readonly Capacidad[] = [
  platformTenantPanel,
  platformPreciosList,
  platformPreciosSet,
  platformUsersList,
  platformUsersSetRole,
];
