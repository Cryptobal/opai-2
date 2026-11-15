import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import type { Capacidad } from "../../types";
import { dondeCuenta } from "./alcance";
import { cuentaDe } from "./cuentas-acceso";
import {
  cuentaDeReferencia,
  hoyReferencias,
  referenciaSchema,
  ultimasReferencias,
  vistaReferencia,
} from "./referencias-vista";
import { cuentasReferenciasOtorgar } from "./referencias-escritura";
import { cuentasReferenciasRevocar } from "./referencias-revocar";

export const cuentasReferenciasList = defineCapability({
  // Revela qué clientes consintieron ser referencia y la evidencia: se auditan las cuentas entregadas.
  auditarLectura: (s) => [...new Set([...s.items, ...s.historial].map((r) => r.cuentaId))],
  id: "core.cuentas_referencias.list",
  descripcion:
    "Lista los clientes que consintieron ser referencia comercial, con su estado (otorgado o revocado), si está vigente para documentos, cómo aparecen (nombre o anonimizado) y la evidencia del consentimiento (el detalle, el motivo y el contacto solo para quien gestiona cuentas o autoriza referencias). Con una cuenta, puede traer su historial completo. Paginada por cursor (la última cuenta de la página); si esa cuenta deja de estar en la lista entre páginas, la lista termina: conviene volver a empezar.",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp"],
  input: z.object({
    cuentaId: uuidSchema.optional().describe("Solo esta cuenta."),
    soloVigentes: z.boolean().default(false).describe("Solo las que hoy salen en documentos."),
    historial: z
      .boolean()
      .default(false)
      .describe(
        "Con cuentaId: todos los otorgamientos y revocaciones, del más nuevo al más antiguo.",
      ),
    // CAR-353: contrato único de listas (cursor + limite; items + siguiente) sobre `items`.
    cursor: uuidSchema.optional().describe("Valor de «siguiente» de la página anterior."),
    limite: z.number().int().min(1).max(200).default(200),
  }),
  output: z.object({
    items: z.array(referenciaSchema),
    siguiente: z.string().nullable(),
    historial: z.array(referenciaSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const hoy = hoyReferencias();
    const ver =
      ctx.autorizar(PERMISOS_CORE.cuentasManage) ||
      ctx.autorizar(PERMISOS_CORE.cuentasReferenciasAutorizar);
    if (input.cuentaId) await cuentaDe(ctx, input.cuentaId);
    const donde = { AND: [dondeCuenta(ctx)], ...(input.cuentaId ? { id: input.cuentaId } : {}) };
    const ultimas = (await ultimasReferencias(ctx, donde))
      .map((f) => vistaReferencia(f, hoy, ver))
      .filter((v) => !input.soloVigentes || v.vigente)
      .sort(
        (a, b) =>
          a.cuentaNombre.localeCompare(b.cuentaNombre, "es") || (a.cuentaId < b.cuentaId ? -1 : 1),
      );
    // Un cursor que ya no está (revocada entre páginas, otra empresa) termina la lista, no la reinicia.
    const enCursor = ultimas.findIndex((v) => v.cuentaId === input.cursor);
    const desde = !input.cursor ? 0 : enCursor < 0 ? ultimas.length : enCursor + 1;
    const pagina = ultimas.slice(desde, desde + input.limite);
    const siguiente =
      desde + input.limite < ultimas.length ? (pagina.at(-1)?.cuentaId ?? null) : null;
    const historial =
      input.historial && input.cuentaId
        ? (
            await ctx.db.cuentaReferencia.findMany({
              where: { cuentaId: input.cuentaId },
              orderBy: { seq: "desc" },
              take: 100,
              include: { cuenta: cuentaDeReferencia },
            })
          ).map((f) => vistaReferencia(f, hoy, ver))
        : [];
    return { items: pagina, siguiente, historial };
  },
});

/** Referencias de clientes con consentimiento (CAR-138 PR 7): listar, otorgar y revocar. */
export const capacidadesReferencias: readonly Capacidad[] = [
  cuentasReferenciasList,
  cuentasReferenciasOtorgar,
  cuentasReferenciasRevocar,
];
