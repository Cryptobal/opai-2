import { z } from "zod";

import { defineCapability, noEncontrado, prohibido, type Contexto } from "@opai/capabilities";

import { codigoVisible } from "../domain";
import { resumenSchema, uuidSchema } from "./esquemas";
import { estadoLoteSchema, loteDetalleSchema, loteResumenSchema } from "./lotes-esquemas";
import { cuentasDeSolicitantes } from "./lotes-util";
import { loteResumenDe } from "./lotes-vista";
import { PERMISO_APROBAR_LOTE, PERMISO_PAGAR } from "./permisos";
import { actorId } from "./util";
import { nombresDe, resumenDe } from "./vista";

/** Quien paga o aprueba lotes los ve; el resto no (ADR-022). */
function exigirLotes(ctx: Contexto): void {
  actorId(ctx);
  if (!ctx.autorizar(PERMISO_PAGAR) && !ctx.autorizar(PERMISO_APROBAR_LOTE)) throw prohibido("No tienes permiso para ver lotes de pago.");
}

const candidataSchema = resumenSchema.extend({
  solicitanteNombre: z.string().nullable(),
  conCuenta: z.boolean().describe("La ficha de la persona tiene banco, cuenta y RUT del titular. El número nunca se muestra aquí."),
  bancoCodigo: z.string().nullable(),
  tipoCuenta: z.string().nullable(),
});

export const lotesCandidatas = defineCapability({
  id: "rendiciones.lotes.candidatas",
  descripcion:
    "Rendiciones aprobadas y todavía sin pagar que pueden entrar a un lote de pago (ninguna está en otro lote activo), con el nombre de quien rindió y si su ficha tiene datos bancarios. No muestra números de cuenta.",
  permiso: null,
  portales: ["erp"],
  input: z.object({ limite: z.number().int().min(1).max(200).default(100) }),
  output: z.object({ rendiciones: z.array(candidataSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.rendiciones.map((r) => r.id),
  async handler(ctx, input) {
    if (!ctx.autorizar(PERMISO_PAGAR)) throw prohibido("No tienes permiso para armar lotes de pago.");
    actorId(ctx);
    const filas = await ctx.db.rendicion.findMany({
      where: { estado: "aprobada", lotes: { none: { activo: true } } },
      orderBy: { codigo: "asc" },
      take: input.limite,
    });
    const cuentas = await cuentasDeSolicitantes(ctx, filas.map((f) => f.solicitanteId));
    const nombres = await nombresDe(ctx, filas.flatMap((f) => [f.solicitanteId, f.aprobadorId]));
    return {
      rendiciones: filas.map((f) => {
        const c = cuentas.get(f.solicitanteId);
        return { ...resumenDe(f, nombres), solicitanteNombre: nombres.get(f.solicitanteId) ?? null, conCuenta: !!c, bancoCodigo: c?.bancoCodigo ?? null, tipoCuenta: c?.tipoCuenta ?? null };
      }),
    };
  },
});

export const lotesListar = defineCapability({
  id: "rendiciones.lotes.listar",
  descripcion: "Lista los lotes de pago de la empresa, del más nuevo al más antiguo, con su estado y total. Filtra por estado.",
  permiso: null,
  portales: ["erp"],
  input: z.object({ estado: estadoLoteSchema.optional(), limite: z.number().int().min(1).max(100).default(50) }),
  output: z.object({ lotes: z.array(loteResumenSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.lotes.map((l) => l.id),
  async handler(ctx, input) {
    exigirLotes(ctx);
    const filas = await ctx.db.lotePago.findMany({ where: input.estado ? { estado: input.estado } : {}, orderBy: { codigo: "desc" }, take: input.limite });
    return { lotes: filas.map(loteResumenDe) };
  },
});

export const lotesObtener = defineCapability({
  id: "rendiciones.lotes.obtener",
  descripcion: "Devuelve un lote de pago con sus rendiciones, quién lo creó, aprobó y pagó, y su historial. No incluye números de cuenta.",
  permiso: null,
  portales: ["erp"],
  input: z.object({ id: uuidSchema }),
  output: z.object({ lote: loteDetalleSchema }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.lote.id],
  async handler(ctx, input) {
    exigirLotes(ctx);
    const l = await ctx.db.lotePago.findFirst({ where: { id: input.id }, include: { items: true, historial: { orderBy: { createdAt: "asc" } } } });
    if (!l) throw noEncontrado("El lote de pago");
    const rends = await ctx.db.rendicion.findMany({ where: { id: { in: l.items.map((i) => i.rendicionId) } }, select: { id: true, codigo: true, descripcion: true, solicitanteId: true } });
    const nombres = await nombresDe(ctx, rends.map((r) => r.solicitanteId));
    const por = new Map(rends.map((r) => [r.id, r]));
    return {
      lote: {
        ...loteResumenDe(l),
        items: l.items.map((i) => {
          const r = por.get(i.rendicionId);
          return { rendicionId: i.rendicionId, codigoVisible: codigoVisible(r?.codigo ?? 0), personaId: i.personaId, personaNombre: (r && nombres.get(r.solicitanteId)) || null, montoClp: i.montoClp, descripcion: r?.descripcion ?? "" };
        }),
        historial: l.historial.map((h) => ({ tipo: h.tipo, actorId: h.actorId, estadoHasta: h.estadoHasta, comentario: h.comentario, creadoEn: h.createdAt.toISOString() })),
      },
    };
  },
});
