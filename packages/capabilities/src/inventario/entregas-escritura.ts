import { LIMITES_ROPA, normalizarTalla } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISOS_INVENTARIO, tallaSchema } from "./comun";
import { destinoSchema, entregaSchema, exigirDestino } from "./entregas-comun";
import { destinoDe, registrar } from "./entregas-registrar";
import { aplicarMovimiento, cantidadActual, tipoDeRopa } from "./ropa-movimiento";

const notaSchema = z.string().trim().max(LIMITES_ROPA.notaMax);

export const entregarActivo = defineCapability({
  id: "inventario.entregas.entregar_activo",
  descripcion:
    "Entrega un activo disponible (un teléfono, una radio) a una persona o a una instalación. El activo pasa a «Asignado» hasta que se devuelva.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({ activoId: uuidSchema, ...destinoSchema, nota: notaSchema.optional() }),
  output: entregaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await exigirDestino(ctx, input);
    const activo = await ctx.db.inventarioActivo.findFirst({ where: { id: input.activoId } });
    if (!activo) throw noEncontrado("El activo");
    if (activo.estado !== "disponible")
      throw reglaDeNegocio("Solo se entrega un activo disponible.");
    const tipoActivo = await ctx.db.inventarioTipo.findFirst({
      where: { id: activo.tipoId },
      select: { activo: true },
    });
    if (!tipoActivo?.activo) throw reglaDeNegocio("El tipo del activo está desactivado.");
    const datos = {
      activoId: activo.id,
      tipoId: null,
      talla: null,
      cantidad: null,
      ...destinoDe(input),
    };
    return registrar(ctx, datos, dryRun, async (tx) => {
      // Solo si sigue disponible: dos entregas a la vez no se pisan (R20).
      const r = await tx.inventarioActivo.updateMany({
        where: { id: activo.id, estado: "disponible" },
        data: { estado: "asignado" },
      });
      if (r.count !== 1) throw conflicto("El activo ya no está disponible.");
    });
  },
});

export const entregarRopa = defineCapability({
  id: "inventario.entregas.entregar_ropa",
  descripcion:
    "Entrega unidades de una talla de ropa (por ejemplo, el uniforme) a una persona o a una instalación. Descuenta de las existencias; si no alcanzan, no entrega nada.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    tipoId: uuidSchema,
    talla: tallaSchema,
    cantidad: z.number().int().min(1).max(LIMITES_ROPA.cantidadMax),
    ...destinoSchema,
    nota: notaSchema.optional(),
  }),
  output: entregaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await exigirDestino(ctx, input);
    const tipo = await tipoDeRopa(ctx, input.tipoId);
    if (!tipo.activo) throw reglaDeNegocio("El tipo está desactivado.");
    const talla = normalizarTalla(input.talla);
    if ((await cantidadActual(ctx, tipo.id, talla)) < input.cantidad)
      throw reglaDeNegocio(`No hay suficientes unidades de la talla ${talla}.`);
    const datos = {
      activoId: null,
      tipoId: tipo.id,
      talla,
      cantidad: input.cantidad,
      ...destinoDe(input),
    };
    return registrar(ctx, datos, dryRun, async (tx) => {
      await aplicarMovimiento(ctx, tx, {
        tipoId: tipo.id,
        talla,
        delta: -input.cantidad,
        motivo: "entrega",
        nota: datos.nota,
      });
    });
  },
});
