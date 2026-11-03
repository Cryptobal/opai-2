import type { ReactNode } from "react";

import { SeccionCatalogos } from "@/app/(erp)/negocios/_configuracion/seccion-catalogos";
import { SeccionEmbudo } from "@/app/(erp)/negocios/_configuracion/seccion-embudo";
import { SeccionTiposTicket } from "@/app/(erp)/configuracion/_tickets/seccion-tipos";
import { SeccionConceptos } from "@/app/(erp)/configuracion/_nomina/seccion-conceptos";
import { SeccionPortalCliente } from "@/app/(erp)/configuracion/_portal_cliente/seccion-portal-cliente";
import { SeccionCanales } from "@/app/(erp)/configuracion/_leads/seccion-canales";
import { SeccionTiposIncidente } from "@/app/(erp)/configuracion/_rondas/seccion-tipos-incidente";
import { SeccionCentrosCosto } from "@/app/(erp)/configuracion/_finanzas/seccion-centros-costo";
import { SeccionFlujoCaja } from "@/app/(erp)/configuracion/_finanzas/seccion-flujo-caja";
import { SeccionPlanCuentas } from "@/app/(erp)/configuracion/_finanzas/seccion-plan-cuentas";
import { SeccionCatalogoCpq } from "@/app/(erp)/configuracion/_cpq/seccion-catalogo";
import { SeccionMarcaPlantillasCpq } from "@/app/(erp)/configuracion/_cpq/seccion-marca-plantillas";
import { SeccionImportar10 } from "@/app/(erp)/configuracion/_comercial/seccion-importar-1-0";

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
      id: "importar-1-0",
      etiqueta: "Importar 1.0",
      permiso: "comercial:config.manage",
      Contenido: SeccionImportar10,
    },
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
    {
      id: "canales",
      etiqueta: "Canales de entrada",
      permiso: "comercial:canales.manage",
      Contenido: SeccionCanales,
    },
  ],
  nomina: [
    {
      id: "conceptos",
      etiqueta: "Conceptos",
      permiso: "nomina:config.manage",
      Contenido: SeccionConceptos,
    },
  ],
  portal_cliente: [
    {
      id: "portal",
      etiqueta: "Portal Cliente",
      // Permiso copiado del manifest de Portal Cliente (CAR-88): qué ve cada cliente y quién entra.
      permiso: "portal_cliente:config.read",
      Contenido: SeccionPortalCliente,
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
  finanzas: [
    {
      id: "flujo-caja",
      etiqueta: "Flujo de caja",
      permiso: "finanzas:flujo.configurar",
      Contenido: SeccionFlujoCaja,
    },
    {
      id: "plan-cuentas",
      etiqueta: "Plan de cuentas",
      permiso: "finanzas:plan.manage",
      Contenido: SeccionPlanCuentas,
    },
    {
      id: "centros-costo",
      etiqueta: "Centros de costo",
      permiso: "finanzas:read",
      Contenido: SeccionCentrosCosto,
    },
  ],
  cpq: [
    {
      id: "marca-plantillas",
      etiqueta: "Marca y plantillas",
      permiso: "cpq:modelo.manage",
      Contenido: SeccionMarcaPlantillasCpq,
    },
    {
      id: "catalogo",
      etiqueta: "Catálogo",
      permiso: "cpq:modelo.manage",
      Contenido: SeccionCatalogoCpq,
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
