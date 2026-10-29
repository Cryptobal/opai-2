import { operacionesEmpresa, sembrarCatalogo, type TenantDb } from "@opai/db";

import { crearInvitacion, type DatosInvitacion } from "./core/invitar";
import { sembrarModulo } from "./core/siembras-modulo";
import type { Servicios } from "./types";

/**
 * Lo que una capacidad `platform.*` puede hacer dentro de una empresa (CAR-40): las operaciones con
 * nombre y `select` acotado de `@opai/db` más las tres escrituras compuestas de Plataforma (sembrar
 * el catálogo de la vertical, sembrar un módulo e invitar a su administrador). El cliente de la
 * empresa queda encerrado aquí: ningún handler recibe un delegado libre.
 */
export function empresaDePlataforma(db: TenantDb, tenantId: string) {
  return {
    ...operacionesEmpresa(db, tenantId),
    sembrarCatalogo: (vertical: string) => sembrarCatalogo(db, tenantId, vertical),
    sembrarModulo: (moduloId: string) => sembrarModulo(moduloId, db, tenantId),
    invitar: (
      tenant: { id: string; slug: string; nombre: string },
      datos: DatosInvitacion,
      servicios: Servicios,
      dryRun: boolean,
    ) => crearInvitacion(db, tenant, datos, servicios, dryRun),
  };
}

export type EmpresaPlataforma = ReturnType<typeof empresaDePlataforma>;
