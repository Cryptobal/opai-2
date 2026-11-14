import { LIMITES_ROPA, normalizarTalla } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISOS_INVENTARIO } from "./comun";
import { destinoSchema, entregaSchema, exigirDestino, vistaEntrega } from "./entregas-comun";
import { aplicarMovimiento } from "./ropa-movimiento";

const notaSchema = z.string().trim().max(LIMITES_ROPA.notaMax);
const ahoraVistaPrevia = () => new Date();

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
    if (activo.estado !== "disponible") throw reglaDeNegocio("Solo se entrega un activo disponible.");
    const tipoActivo = await ctx.db.inventarioTipo.findFirst({ where: { id: activo.tipoId }, select: { activo: true } });
    if (!tipoActivo?.activo) throw reglaDeNegocio("El tipo del activo está desactivado.");
    const datos = {
      activoId: activo.id,
      tipoId: null,
      talla: null,
      cantidad: null,
      personaId: input.personaId ?? null,
      instalacionId: input.instalacionId ?? null,
      nota: input.nota || null,
    };
    const base = { id: "00000000-0000-7000-8000-000000000000", entregadaEn: ahoraVistaPrevia(), devueltaEn: null, notaDevolucion: null };
    if (dryRun) return vistaEntrega(ctx, { ...base, ...datos });
    const fila = await ctx.transaccion(async (tx) => {
      // Solo si sigue disponible: dos entregas a la vez no se pisan (R20).
      const r = await tx.inventarioActivo.updateMany({ where: { id: activo.id, estado: "disponible" }, data: { estado: "asignado" } });
      if (r.count !== 1) throw conflicto("El activo ya no está disponible.");
      const e = await sinDuplicado(tx.inventarioEntrega.create({ data: { ...datos, tenantId: ctx.tenantId } }), "El activo ya está entregado.");
      await ctx.eventos.emitir(tx, { tipo: "inventario.entrega.registrada", entidadTipo: "inventario_entrega", entidadId: e.id, payload: { clase: "activo" } });
      return e;
    });
    return vistaEntrega(ctx, fila);
  },
});

export const entregarRopa = defineCapability({
  id: "inventario.entregas.entregar_ropa",
  descripcion:
    "Entrega unidades de una talla de ropa (por ejemplo, el uniforme) a una persona o a una instalación. Descuenta de las existencias; si no alcanzan, no entrega nada.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    tipoId: uuidSchema,
    talla: z.string().trim().min(1).max(10),
    cantidad: z.number().int().min(1).max(LIMITES_ROPA.cantidadMax),
    ...destinoSchema,
    nota: notaSchema.optional(),
  }),
  output: entregaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await exigirDestino(ctx, input);
    const tipo = await ctx.db.inventarioTipo.findFirst({ where: { id: input.tipoId } });
    if (!tipo) throw noEncontrado("El tipo de ropa");
    if (tipo.categoria !== "ropa") throw reglaDeNegocio("Los activos se entregan uno por uno.");
    if (!tipo.activo) throw reglaDeNegocio("El tipo está desactivado.");
    const talla = normalizarTalla(input.talla);
    const hay = await ctx.db.inventarioExistencia.findFirst({ where: { tipoId: tipo.id, talla }, select: { cantidad: true } });
    if ((hay?.cantidad ?? 0) < input.cantidad) throw reglaDeNegocio(`No hay suficientes unidades de la talla ${talla}.`);
    const datos = {
      activoId: null,
      tipoId: tipo.id,
      talla,
      cantidad: input.cantidad,
      personaId: input.personaId ?? null,
      instalacionId: input.instalacionId ?? null,
      nota: input.nota || null,
    };
    const base = { id: "00000000-0000-7000-8000-000000000000", entregadaEn: ahoraVistaPrevia(), devueltaEn: null, notaDevolucion: null };
    if (dryRun) return vistaEntrega(ctx, { ...base, ...datos });
    const fila = await ctx.transaccion(async (tx) => {
      await aplicarMovimiento(ctx, tx, { tipoId: tipo.id, talla, delta: -input.cantidad, motivo: "entrega", nota: datos.nota });
      const e = await tx.inventarioEntrega.create({ data: { ...datos, tenantId: ctx.tenantId } });
      await ctx.eventos.emitir(tx, { tipo: "inventario.entrega.registrada", entidadTipo: "inventario_entrega", entidadId: e.id, payload: { clase: "ropa" } });
      return e;
    });
    return vistaEntrega(ctx, fila);
  },
});
