// Siembra idempotente del catálogo base de un tenant (cargos con su estructura vigente y tipos de
// documento por capa). La usan `platform.tenants.create` (con `forTenant`) y los scripts de seed.
import {
  CARGOS_POR_VERTICAL,
  esVertical,
  PATRONES_FABRICA,
  tiposDocumentoBase,
} from "@opai/domain";

import type { TenantDb } from "./for-tenant";

/** Lo mínimo que necesita la siembra: el cliente del tenant o, en scripts, `dbAdmin().$extends({})`. */
export type ClienteCatalogo = Pick<
  TenantDb,
  "cargo" | "estructuraSueldo" | "documentoTipo" | "patronTurno"
>;

const INICIO = new Date("2026-01-01");

export async function sembrarCatalogo(db: ClienteCatalogo, tenantId: string, vertical: string) {
  const v = esVertical(vertical) ? vertical : "seguridad";
  for (const [i, c] of CARGOS_POR_VERTICAL[v].entries()) {
    const cargo = await db.cargo.upsert({
      where: { tenantId_nombre: { tenantId, nombre: c.nombre } },
      update: {},
      create: {
        tenantId,
        nombre: c.nombre,
        clase: c.clase,
        orden: i,
        sueldoSensible: c.clase === "administrativo",
      },
    });
    const existe = await db.estructuraSueldo.count({
      where: { tenantId, nivel: "cargo", cargoId: cargo.id },
    });
    if (!existe) {
      await db.estructuraSueldo.create({
        data: {
          tenantId,
          nivel: "cargo",
          cargoId: cargo.id,
          sueldoBase: c.sueldoBase,
          colacion: 45_000,
          movilizacion: 40_000,
          gratificacion: "legal_25",
          vigenteDesde: INICIO,
        },
      });
    }
  }
  for (const [i, p] of PATRONES_FABRICA.entries()) {
    await db.patronTurno.upsert({
      where: { tenantId_nombre: { tenantId, nombre: p.nombre } },
      update: {},
      create: {
        tenantId,
        nombre: p.nombre,
        clase: p.clase,
        diasTrabajo: p.diasTrabajo,
        diasDescanso: p.diasDescanso,
        diasSemana: [...p.diasSemana],
        deFabrica: true,
        orden: i,
      },
    });
  }
  for (const [i, t] of tiposDocumentoBase(v).entries()) {
    await db.documentoTipo.upsert({
      where: { tenantId_codigo: { tenantId, codigo: t.codigo } },
      update: {},
      create: {
        tenantId,
        codigo: t.codigo,
        nombre: t.nombre,
        capa: t.capa,
        obligatorio: t.obligatorio ?? false,
        tieneVencimiento: t.tieneVencimiento ?? false,
        normativa: t.normativa ?? null,
        mimesPermitidos: [...(t.mimesPermitidos ?? [])],
        orden: i,
      },
    });
  }
}
