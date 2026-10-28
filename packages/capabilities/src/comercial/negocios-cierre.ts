import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_MANAGE, negocioDe, negocioSchema, vistaNegocio } from "./comun";
import { aplicarEtapa } from "./transiciones-util";
import { validarEntrada } from "./validaciones";

export const negociosPerder = defineCapability({
  id: "comercial.negocios.perder",
  descripcion:
    "Marca un negocio como perdido con un motivo del catálogo (detalle obligatorio en «otro»), moviéndolo a la etapa perdida del embudo (R19). Reversible reabriendo.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    motivoPerdidaId: uuidSchema,
    detalle: z.string().trim().max(500).nullable().optional(),
    competidor: z.string().trim().max(160).nullable().optional(),
  }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.id);
    if (negocio.estado === "perdido") throw reglaDeNegocio("El negocio ya está perdido.");
    if (negocio.estado === "ganado")
      throw reglaDeNegocio("Un negocio ganado no se pierde; se reemplaza.");
    const motivo = await ctx.db.motivoPerdida.findUnique({ where: { id: input.motivoPerdidaId } });
    if (!motivo) throw noEncontrado("El motivo de pérdida");
    if (motivo.exigeDetalle && !input.detalle?.trim()) {
      throw reglaDeNegocio("El motivo «otro» exige un detalle.");
    }
    const perdida = await ctx.db.etapa.findFirst({
      where: { embudoId: negocio.embudoId, tipo: "perdida" },
    });
    if (!perdida) throw reglaDeNegocio("El embudo no tiene etapa perdida.");
    const datos = {
      perdidoEn: new Date(),
      motivoPerdidaId: input.motivoPerdidaId,
      motivoPerdidaDetalle: input.detalle ?? null,
      competidor: input.competidor ?? null,
    };
    if (dryRun)
      return vistaNegocio({ ...negocio, etapaId: perdida.id, estado: "perdido", ...datos });
    const r = await ctx.transaccion((tx) =>
      aplicarEtapa(ctx, tx, negocio, perdida, {
        evento: "comercial.negocio.perdido",
        motivo: motivo.codigo,
        datos,
      }),
    );
    return vistaNegocio(r);
  },
});

export const negociosReabrir = defineCapability({
  id: "comercial.negocios.reabrir",
  descripcion:
    "Reabre un negocio perdido con un motivo, devolviéndolo a la etapa abierta que se elija (por defecto, la primera); queda en el historial (R20). Un negocio ganado no se reabre.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    motivo: z.string().trim().min(3).max(500),
    etapaId: uuidSchema
      .optional()
      .describe("Etapa abierta a la que vuelve; por defecto, la primera."),
  }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.id);
    if (negocio.estado !== "perdido") throw reglaDeNegocio("Solo se reabre un negocio perdido.");
    const primera = await ctx.db.etapa.findFirst({
      where: {
        embudoId: negocio.embudoId,
        tipo: "abierta",
        activa: true,
        ...(input.etapaId ? { id: input.etapaId } : {}),
      },
      orderBy: { orden: "asc" },
    });
    if (!primera) {
      throw reglaDeNegocio(
        input.etapaId
          ? "La etapa elegida no es una etapa abierta y activa del embudo."
          : "El embudo no tiene etapas abiertas.",
      );
    }
    // Reabrir en una etapa avanzada valida como si avanzara desde la primera (R9 y R10).
    const minimo = await ctx.db.etapa.findFirst({
      where: { embudoId: negocio.embudoId, tipo: "abierta", activa: true },
      orderBy: { orden: "asc" },
      select: { orden: true },
    });
    if (minimo && primera.orden > minimo.orden) {
      await validarEntrada(ctx, negocio, primera, 0);
    }
    const datos = {
      perdidoEn: null,
      motivoPerdidaId: null,
      motivoPerdidaDetalle: null,
      competidor: null,
      reabiertoEn: new Date(),
    };
    if (dryRun)
      return vistaNegocio({ ...negocio, etapaId: primera.id, estado: "abierto", ...datos });
    const r = await ctx.transaccion((tx) =>
      aplicarEtapa(ctx, tx, negocio, primera, {
        evento: "comercial.negocio.etapa_cambiada",
        motivo: input.motivo,
        datos,
      }),
    );
    return vistaNegocio(r);
  },
});

export const negociosArchivar = defineCapability({
  id: "comercial.negocios.archivar",
  descripcion:
    "Archiva o desarchiva un negocio: desaparece de las listas por defecto sin borrarlo. Reversible (archivar=false lo restaura).",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, archivar: z.boolean().default(true) }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.id);
    const archivadoEn = input.archivar ? new Date() : null;
    if (dryRun) return vistaNegocio({ ...negocio, archivadoEn });
    const r = await ctx.transaccion(async (tx) => {
      const n = await tx.negocio.update({ where: { id: input.id }, data: { archivadoEn } });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.archivado",
        entidadTipo: "negocio",
        entidadId: n.id,
        payload: { archivado: input.archivar },
      });
      return n;
    });
    return vistaNegocio(r);
  },
});
