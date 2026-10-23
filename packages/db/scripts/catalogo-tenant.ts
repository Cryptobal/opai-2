// Lista de precios de plataforma (valores en docs/2.0/precios-recursos.md). Solo scripts.
import { PRECIOS_RECURSOS_BASE } from "@opai/domain";

import type { PrismaClient } from "../src/generated/prisma/client";

export { sembrarCatalogo } from "../src/catalogo-tenant";

const INICIO = new Date("2026-01-01");

export async function sembrarPrecios(db: PrismaClient) {
  for (const p of PRECIOS_RECURSOS_BASE) {
    await db.precioRecurso.upsert({
      where: { recurso_vigenteDesde: { recurso: p.recurso, vigenteDesde: INICIO } },
      update: {},
      create: { ...p, vigenteDesde: INICIO },
    });
  }
}
