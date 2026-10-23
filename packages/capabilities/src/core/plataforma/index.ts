import type { Capacidad } from "../../types";
import { platformPreciosList, platformPreciosSet } from "./precios";
import { platformTenantPanel } from "./tenant-panel";

export { platformTenantsList } from "./tenants-lista";
export { platformTrabajosList } from "./trabajos-lista";

/** Capacidades de las pantallas de Plataforma (sesión C): panel por empresa y precios. */
export const capacidadesPlataforma: readonly Capacidad[] = [
  platformTenantPanel,
  platformPreciosList,
  platformPreciosSet,
];
