import { z } from "zod";

import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { REQUISITOS, TONOS_ETAPA } from "./dominio";
import { PERMISO_CONFIG, etapaSchema } from "./comun";
import {
  cerradas,
  emitirEmbudo,
  etapasDelEmbudo,
  type FilaEtapa,
  MAX_ETAPAS,
  renumerar,
  vistaEtapa,
} from "./embudo-util";

/** Agrega una etapa abierta al embudo por defecto, al final de las abiertas o en una posición. */
export const configCrearEtapa = defineCapability({
  id: "comercial.config.crear_etapa",
  descripcion:
    "Agrega una etapa abierta al embudo de ventas, al final de las abiertas o en una posición dada, con su probabilidad, tono y requisitos de entrada. La ganada y la perdida siguen al final.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    nombre: z.string().trim().min(2).max(60),
    probabilidad: z.number().int().min(0).max(100).default(0),
    tono: z.enum(TONOS_ETAPA).default("neutral"),
    exige: z.array(z.enum(REQUISITOS)).max(REQUISITOS.length).default([]),
    posicion: z
      .number()
      .int()
      .min(0)
      .max(MAX_ETAPAS)
      .optional()
      .describe(
        "Posición entre las etapas abiertas (0 = primera); por defecto, la última abierta.",
      ),
  }),
  output: etapaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { embudo, etapas } = await etapasDelEmbudo(ctx);
    if (etapas.length >= MAX_ETAPAS)
      throw reglaDeNegocio(`El embudo admite hasta ${MAX_ETAPAS} etapas.`);
    const nombre = input.nombre.toLowerCase();
    if (etapas.some((e) => e.nombre.toLowerCase() === nombre)) {
      throw reglaDeNegocio("Ya hay una etapa con ese nombre.");
    }
    const abiertas = etapas.filter((e) => e.tipo === "abierta");
    const pos = Math.min(input.posicion ?? abiertas.length, abiertas.length);
    const datos = {
      nombre: input.nombre,
      tipo: "abierta",
      probabilidad: input.probabilidad,
      tono: input.tono,
      exige: [...input.exige],
      activa: true,
      orden: pos,
    };
    if (dryRun) return vistaEtapa({ id: "", ...datos });
    const antes = abiertas.slice(0, pos).map((e) => e.id);
    const despues = [...abiertas.slice(pos), ...cerradas(etapas)].map((e) => e.id);
    const creada = await ctx.transaccion(async (tx) => {
      const e = await renumerar(tx, [...antes, null, ...despues], (orden) =>
        tx.etapa.create({ data: { ...datos, orden, tenantId: ctx.tenantId, embudoId: embudo.id } }),
      );
      await emitirEmbudo(ctx, tx, embudo.id, "etapa_creada");
      if (!e) throw reglaDeNegocio("No se pudo crear la etapa.");
      return e;
    });
    return vistaEtapa(creada);
  },
});

/** Reordena las etapas abiertas del embudo de una vez (la ganada y la perdida quedan al final). */
export const configReordenarEtapas = defineCapability({
  id: "comercial.config.reordenar_etapas",
  descripcion:
    "Reordena las etapas del embudo de ventas: recibe la lista completa de ids en el orden nuevo y la aplica de una vez. La ganada y la perdida no se mueven del final (R26).",
  permiso: PERMISO_CONFIG,
  input: z.object({
    ids: z
      .array(uuidSchema)
      .min(2)
      .max(MAX_ETAPAS)
      .describe("Todas las etapas, en el orden nuevo."),
  }),
  output: z.object({ etapas: z.array(etapaSchema) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { embudo, etapas } = await etapasDelEmbudo(ctx);
    const ids = input.ids;
    const actuales = new Set(etapas.map((e) => e.id));
    if (
      new Set(ids).size !== ids.length ||
      ids.length !== etapas.length ||
      ids.some((id) => !actuales.has(id))
    ) {
      throw reglaDeNegocio("Envía todas las etapas del embudo, cada una una sola vez.");
    }
    const fijas = cerradas(etapas).map((e) => e.id);
    if (ids.slice(ids.length - fijas.length).join() !== fijas.join()) {
      throw reglaDeNegocio("La ganada y la perdida no se reordenan: van siempre al final.");
    }
    const porId = new Map(etapas.map((e) => [e.id, e]));
    const nuevas = ids.map((id, i) => ({ ...(porId.get(id) as FilaEtapa), orden: i }));
    if (dryRun) return { etapas: nuevas.map(vistaEtapa) };
    await ctx.transaccion(async (tx) => {
      await renumerar(tx, ids);
      await emitirEmbudo(ctx, tx, embudo.id, "etapas_reordenadas");
    });
    return { etapas: nuevas.map(vistaEtapa) };
  },
});
