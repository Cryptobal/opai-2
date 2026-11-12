import { z } from "zod";

import { puedeConfirmarContexto } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, prohibido } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_MANAGE, negocioDe } from "./comun";
import { contextoSchema, vista } from "./contexto-negocio-comun";
import { idAutor } from "../autor";

export const contextoConfirmar = defineCapability({
  id: "comercial.contexto.confirmar",
  descripcion:
    "Confirma una nota de contexto comercial que estaba inferida. Solo una persona puede confirmar: un agente no puede convertir su propia inferencia en un hecho.",
  permiso: PERMISO_MANAGE,
  input: z.object({ negocioId: uuidSchema, contextoId: uuidSchema }),
  output: contextoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!puedeConfirmarContexto(ctx.actor.tipo)) {
      throw prohibido("Solo una persona puede confirmar el contexto comercial.");
    }
    const negocio = await negocioDe(ctx, input.negocioId);
    const fila = await ctx.db.negocioContexto.findFirst({
      where: { id: input.contextoId, negocioId: negocio.id, archivadoEn: null },
    });
    if (!fila) throw noEncontrado("La nota de contexto");
    if (fila.estado === "confirmado") return vista(fila);
    const ahora = new Date();
    if (dryRun) return vista({ ...fila, estado: "confirmado", confirmadoEn: ahora });
    return ctx.transaccion(async (tx) => {
      const nueva = await tx.negocioContexto.update({
        where: { id: fila.id },
        data: { estado: "confirmado", confirmadoEn: ahora, confirmadoPorId: idAutor(ctx.actor) },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: negocio.id,
        payload: { contexto: "confirmado" },
      });
      return vista(nueva);
    });
  },
});

export const contextoArchivar = defineCapability({
  id: "comercial.contexto.archivar",
  descripcion:
    "Archiva una nota de contexto comercial que ya no aplica; deja de usarse para generar textos pero se conserva en la base.",
  permiso: PERMISO_MANAGE,
  input: z.object({ negocioId: uuidSchema, contextoId: uuidSchema }),
  output: z.object({ id: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    const fila = await ctx.db.negocioContexto.findFirst({
      where: { id: input.contextoId, negocioId: negocio.id, archivadoEn: null },
    });
    if (!fila) throw noEncontrado("La nota de contexto");
    if (dryRun) return { id: fila.id };
    await ctx.transaccion(async (tx) => {
      await tx.negocioContexto.update({
        where: { id: fila.id },
        data: { archivadoEn: new Date() },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: negocio.id,
        payload: { contexto: "archivado" },
      });
    });
    return { id: fila.id };
  },
});
