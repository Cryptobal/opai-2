import { z } from "zod";

import { CLASES_FIRMA, type ClaseFirma } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import {
  claseSchema,
  nivelSchema,
  ordenSchema,
  PERMISO_FIRMAS_CONFIG,
  PLAZO_MAX,
  politicaEfectiva,
  politicaSchema,
  validarPolitica,
  type VistaPolitica,
} from "./comun";

type FilaPolitica = {
  clase: string;
  nivelMinimo: string;
  nivelesPermitidos: string[];
  orden: string;
  plazoDias: number;
  recordar: boolean;
};

const matriz = (filas: FilaPolitica[]): VistaPolitica[] => {
  const porClase = new Map(filas.map((f) => [f.clase, f]));
  return CLASES_FIRMA.map((c) => politicaEfectiva(c, porClase.get(c) ?? null));
};

export const firmasPoliticaGet = defineCapability({
  id: "core.firmas.politica_get",
  descripcion:
    "Lee la política de firma por tipo de documento (nivel mínimo, niveles permitidos, orden, plazo y recordatorios): lo que fijó el tenant o el valor por defecto de su vertical. firma.md §4.",
  permiso: PERMISO_FIRMAS_CONFIG,
  input: z.object({ clase: claseSchema.optional() }),
  output: z.object({ politicas: z.array(politicaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = (await ctx.db.politicaFirma.findMany({
      where: { tenantId: ctx.tenantId },
    })) as FilaPolitica[];
    const todas = matriz(filas);
    const politicas = input.clase ? todas.filter((p) => p.clase === input.clase) : todas;
    return { politicas };
  },
});

export const firmasPoliticaSet = defineCapability({
  id: "core.firmas.politica_set",
  descripcion:
    "Fija la política de firma de un tipo de documento sin bajar del mínimo legal de la plataforma (R2): nivel mínimo, niveles permitidos, orden, plazo en días y recordatorios. N3 está apagada (P2/P3).",
  permiso: PERMISO_FIRMAS_CONFIG,
  input: z.object({
    clase: claseSchema,
    nivelMinimo: nivelSchema,
    nivelesPermitidos: z.array(nivelSchema).min(1),
    orden: ordenSchema.default("secuencial"),
    plazoDias: z.number().int().min(1).max(PLAZO_MAX).default(7),
    recordar: z.boolean().default(true),
  }),
  output: politicaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const error = validarPolitica(input.clase as ClaseFirma, input.nivelMinimo, input.nivelesPermitidos);
    if (error) throw reglaDeNegocio(error);
    const vista: VistaPolitica = {
      clase: input.clase,
      nivelMinimo: input.nivelMinimo,
      nivelesPermitidos: input.nivelesPermitidos,
      orden: input.orden,
      plazoDias: input.plazoDias,
      recordar: input.recordar,
      personalizada: true,
    };
    if (dryRun) return vista;
    // La escritura se audita sola en su transacción (ADR-052); no hay consumidor de evento aún.
    const datos = {
      nivelMinimo: input.nivelMinimo,
      nivelesPermitidos: input.nivelesPermitidos,
      orden: input.orden,
      plazoDias: input.plazoDias,
      recordar: input.recordar,
      actualizadoPorId: ctx.actor.id ?? null,
    };
    await ctx.transaccion((tx) =>
      tx.politicaFirma.upsert({
        where: { tenantId_clase: { tenantId: ctx.tenantId, clase: input.clase } },
        create: { tenantId: ctx.tenantId, clase: input.clase, ...datos },
        update: datos,
      }),
    );
    return vista;
  },
});
