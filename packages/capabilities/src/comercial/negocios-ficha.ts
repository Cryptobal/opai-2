import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { diasEntre } from "./dominio";
import { PERMISO_READ, negocioDe, negocioSchema, vistaNegocio } from "./comun";

/** Ficha de un negocio: datos, etapa, instalaciones, contactos e historial de etapas (R11). */
export const negociosGet = defineCapability({
  auditarLectura: (s) => [s.id, s.cuentaId, ...s.contactos.map((c) => c.contactoId)],
  id: "comercial.negocios.get",
  descripcion:
    "Ficha de un negocio: datos, cuenta, etapa actual, instalaciones con su tipo, contactos con su rol e historial de etapas con los días en cada una.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: negocioSchema.extend({
    cuentaNombre: z.string(),
    etapaNombre: z.string(),
    etapaTipo: z.string(),
    instalaciones: z.array(
      z.object({ id: z.string(), instalacionId: z.string(), nombre: z.string(), tipo: z.string() }),
    ),
    contactos: z.array(
      z.object({
        id: z.string(),
        contactoId: z.string(),
        nombre: z.string(),
        rol: z.string(),
        esPrincipal: z.boolean(),
      }),
    ),
    historial: z.array(
      z.object({
        id: z.string(),
        de: z.string().nullable(),
        a: z.string(),
        cuando: z.string(),
        dias: z.number().nullable(),
        motivo: z.string().nullable(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const n = await negocioDe(ctx, input.id);
    const [cuenta, etapa, vinculosI, vinculosC, historial] = await Promise.all([
      ctx.db.cuenta.findUnique({ where: { id: n.cuentaId }, select: { nombre: true } }),
      ctx.db.etapa.findUnique({ where: { id: n.etapaId }, select: { nombre: true, tipo: true } }),
      ctx.db.negocioInstalacion.findMany({ where: { negocioId: n.id } }),
      ctx.db.negocioContacto.findMany({ where: { negocioId: n.id } }),
      ctx.db.historialEtapa.findMany({ where: { negocioId: n.id }, orderBy: { cuando: "asc" } }),
    ]);
    const instIds = vinculosI.map((v) => v.instalacionId);
    const contIds = vinculosC.map((v) => v.contactoId);
    const etapaIds = [...new Set(historial.flatMap((h) => [h.deEtapaId, h.aEtapaId].filter(Boolean)))];
    const [insts, conts, etapas] = await Promise.all([
      ctx.db.instalacion.findMany({ where: { id: { in: instIds } }, select: { id: true, nombre: true } }),
      ctx.db.contacto.findMany({
        where: { id: { in: contIds } },
        select: { id: true, nombres: true, apellidos: true },
      }),
      ctx.db.etapa.findMany({ where: { id: { in: etapaIds as string[] } }, select: { id: true, nombre: true } }),
    ]);
    const nombreEtapa = (id: string | null) =>
      id ? (etapas.find((e) => e.id === id)?.nombre ?? null) : null;
    return {
      ...vistaNegocio(n),
      cuentaNombre: cuenta?.nombre ?? "",
      etapaNombre: etapa?.nombre ?? "",
      etapaTipo: etapa?.tipo ?? "abierta",
      instalaciones: vinculosI.map((v) => ({
        id: v.id,
        instalacionId: v.instalacionId,
        nombre: insts.find((i) => i.id === v.instalacionId)?.nombre ?? "",
        tipo: v.tipo,
      })),
      contactos: vinculosC.map((v) => {
        const c = conts.find((x) => x.id === v.contactoId);
        return {
          id: v.id,
          contactoId: v.contactoId,
          nombre: c ? `${c.nombres} ${c.apellidos}`.trim() : "",
          rol: v.rol,
          esPrincipal: v.esPrincipal,
        };
      }),
      historial: historial.map((h, i) => {
        const prev = historial[i - 1];
        const dias =
          h.segundosEnAnterior != null
            ? Math.floor(h.segundosEnAnterior / 86_400)
            : prev
              ? diasEntre(prev.cuando, h.cuando)
              : null;
        return {
          id: h.id,
          de: nombreEtapa(h.deEtapaId),
          a: nombreEtapa(h.aEtapaId) ?? "",
          cuando: h.cuando.toISOString(),
          dias,
          motivo: h.motivo,
        };
      }),
    };
  },
});
