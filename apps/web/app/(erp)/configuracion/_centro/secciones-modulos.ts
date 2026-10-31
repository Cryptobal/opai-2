import type { ReactNode } from "react";

import { SeccionCatalogos } from "@/app/(erp)/negocios/_configuracion/seccion-catalogos";
import { SeccionEmbudo } from "@/app/(erp)/negocios/_configuracion/seccion-embudo";
import { SeccionTiposTicket } from "@/app/(erp)/configuracion/_tickets/seccion-tipos";
import { SeccionTiposIncidente } from "@/app/(erp)/configuracion/_rondas/seccion-tipos-incidente";

/**
 * Pestaña que un módulo aporta a su página de Configuración → Módulos → <módulo> (ADR-018): el
 * módulo no tiene página de configuración propia; el núcleo monta estas pestañas junto a los ajustes
 * del manifest. `Contenido` es un componente de servidor que lee y escribe solo por capacidades.
 */
export type SeccionModulo = {
  id: string;
  etiqueta: string;
  /** Permiso para ver la pestaña: sin él no aparece (sin pestañas deshabilitadas, ADR-041.5). */
  permiso: string;
  Contenido: () => ReactNode | Promise<ReactNode>;
};

/**
 * Registro de secciones de configuración por módulo: cada módulo agrega aquí sus líneas (como
 * `lib/existencia-ruta.ts` para las fichas). El orden es el de las pestañas; «Ajustes» va al final.
 */
export const SECCIONES_MODULO: Readonly<Record<string, readonly SeccionModulo[]>> = {
  comercial: [
    {
      id: "embudo",
      etiqueta: "Embudo",
      permiso: "comercial:config.manage",
      Contenido: SeccionEmbudo,
    },
    {
      id: "catalogos",
      etiqueta: "Catálogos",
      permiso: "comercial:config.manage",
      Contenido: SeccionCatalogos,
    },
  ],
  rondas: [
    {
      id: "incidentes",
      etiqueta: "Tipos de incidente",
      // Permiso copiado del manifest de Rondas (#137): rondas:configurar gestiona el catálogo.
      permiso: "rondas:configurar",
      Contenido: SeccionTiposIncidente,
    },
  ],
  tickets: [
    {
      id: "tipos",
      etiqueta: "Tipos",
      permiso: "tickets:tipos.manage",
      Contenido: SeccionTiposTicket,
    },
  ],
};

/** Pestañas visibles de un módulo para quien tiene `puede`, y la activa según `?seccion=`. */
export function seccionesDe(modulo: string, puede: (permiso: string) => boolean, pedida?: string) {
  const visibles = (SECCIONES_MODULO[modulo] ?? []).filter((s) => puede(s.permiso));
  const activa =
    visibles.find((s) => s.id === pedida) ?? (pedida === "ajustes" ? null : visibles[0]);
  return { visibles, activa: activa ?? null };
}
