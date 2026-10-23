// Siembra idempotente del catálogo base de un tenant (cargos con su estructura vigente y tipos de
// documento por capa) y de la lista de precios de plataforma. Rol propietario: solo scripts.
import {
  CARGOS_POR_VERTICAL,
  esVertical,
  PRECIOS_RECURSOS_BASE,
  tiposDocumentoBase,
} from "@opai/domain";

import type { PrismaClient } from "../src/generated/prisma/client";

const INICIO = new Date("2026-01-01");

export async function sembrarCatalogo(db: PrismaClient, tenantId: string, vertical: string) {
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
          vigenteDesde: INICIO,
        },
      });
    }
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

export async function sembrarPrecios(db: PrismaClient) {
  for (const p of PRECIOS_RECURSOS_BASE) {
    await db.precioRecurso.upsert({
      where: { recurso_vigenteDesde: { recurso: p.recurso, vigenteDesde: INICIO } },
      update: {},
      create: { ...p, vigenteDesde: INICIO },
    });
  }
}
