import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { diaSchema, escribirConEvento, sinDuplicado } from "./comun";
import {
  planearPeriodo,
  sincronizarTipoVinculo,
  vinculoBloqueado,
} from "./contrato-periodos-reglas";
import {
  cargarContrato,
  contratoSchema,
  periodosValidos,
  vinculoVigente,
} from "./contrato-periodos-vista";
import { personaFicha } from "./personas-ficha-comun";
import { reclutadorPorDefecto } from "./vinculos-validacion";

const salida = contratoSchema;

const registrarInput = z
  .object({
    id: uuidSchema,
    tipo: z.enum(["plazo_fijo", "indefinido"]),
    inicio: diaSchema,
    termino: diaSchema.nullable().optional(),
  })
  .refine((v) => v.tipo !== "plazo_fijo" || (v.termino && v.termino >= v.inicio), {
    message: "El plazo fijo necesita un término igual o posterior al inicio.",
    path: ["termino"],
  })
  .refine((v) => v.tipo !== "indefinido" || !v.termino, {
    message: "El contrato indefinido no tiene término.",
    path: ["termino"],
  });

async function contratoDe(ctx: Parameters<typeof cargarContrato>[0], personaId: string) {
  const c = await cargarContrato(ctx, personaId);
  if (!c) throw conflicto("La persona no tiene un contrato vigente.");
  return c;
}

export const personasPeriodosRegistrar = defineCapability({
  id: "core.personas.periodos_registrar",
  descripcion:
    "Registra un período del contrato vigente de una persona: una renovación de plazo fijo (inicio y término) o el paso a contrato indefinido. Queda en la historia con quién lo registró.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: registrarInput,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    if (dryRun) {
      await planearPeriodo(ctx.db, p.id, input);
      return contratoDe(ctx.db, p.id);
    }
    await escribirConEvento(
      ctx,
      {
        tipo: "core.persona.contrato_periodo_registrado",
        entidadTipo: "persona",
        payload: () => ({ tipo: input.tipo }),
      },
      async (tx) => {
        const plan = await planearPeriodo(tx, p.id, input, true);
        const crear = tx.contratoPeriodo.create({
          data: {
            tenantId: p.tenantId,
            personaId: p.id,
            vinculoId: plan.vinculo.id,
            tipo: input.tipo,
            inicio: plan.inicio,
            termino: plan.termino,
            registradoPorId: reclutadorPorDefecto(ctx),
          },
        });
        await sinDuplicado(crear, "Ya hay un período del contrato que empieza ese día.");
        await sincronizarTipoVinculo(tx, plan.vinculo.id, plan.vinculo.tipo);
        return { id: p.id };
      },
    );
    return contratoDe(ctx.db, p.id);
  },
});

export const personasPeriodosAnular = defineCapability({
  id: "core.personas.periodos_anular",
  descripcion:
    "Anula el último período registrado del contrato de una persona cuando se registró mal. No se borra: queda en la auditoría con el motivo, y el contrato vuelve al período anterior.",
  permiso: PERMISOS_CORE.personasLaboralManage,
  input: z.object({
    id: uuidSchema,
    periodoId: uuidSchema,
    motivo: z.string().trim().min(3).max(300),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    const ultimoDe = async (db: typeof ctx.db, bloquear = false) => {
      const v = bloquear ? await vinculoBloqueado(db, p.id) : await vinculoVigente(db, p.id);
      if (!v) throw conflicto("La persona no tiene un contrato vigente.");
      const ultimo = (await periodosValidos(db, v.id)).at(-1);
      if (!ultimo || ultimo.id !== input.periodoId) {
        const existe = await db.contratoPeriodo.findFirst({
          where: { id: input.periodoId, personaId: p.id },
        });
        if (!existe) throw noEncontrado("El período");
        throw conflicto("Solo se puede anular el último período válido del contrato.");
      }
      return v;
    };
    if (dryRun) {
      await ultimoDe(ctx.db);
      return contratoDe(ctx.db, p.id);
    }
    await escribirConEvento(
      ctx,
      { tipo: "core.persona.contrato_periodo_anulado", entidadTipo: "persona" },
      async (tx) => {
        const v = await ultimoDe(tx, true);
        await tx.contratoPeriodo.update({
          where: { id: input.periodoId },
          data: {
            anuladoEn: new Date(),
            anuladoPorId: reclutadorPorDefecto(ctx),
            motivoAnulacion: input.motivo,
          },
        });
        await sincronizarTipoVinculo(tx, v.id, v.tipo);
        return { id: p.id };
      },
    );
    return contratoDe(ctx.db, p.id);
  },
});

export const capacidadesContratoPeriodos = [
  personasPeriodosRegistrar,
  personasPeriodosAnular,
] as const;
