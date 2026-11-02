import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { cifradoDeCampos, cifrarCampoEnTransaccion } from "../cumplimiento/cifrado-campos";
import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { escribirConEvento, textoOpcional } from "./comun";
import {
  enmascararPlanIsapre,
  enmascararPlanIsapreEnLectura,
  personaFicha,
} from "./personas-ficha-comun";
import type { Contexto } from "../../types";

const previsionSchema = z.object({
  personaId: z.string(),
  afp: z.string().nullable(),
  regimen: z.string().nullable(),
  sistemaSalud: z.string().nullable(),
  isapreNombre: z.string().nullable(),
  planIsapre: z.string().nullable(),
  planUf: z.string().nullable(),
  cotizacionUfPct: z.string().nullable(),
});

const inputPrevision = z.object({
  id: uuidSchema,
  afp: textoOpcional(80),
  regimen: textoOpcional(80),
  sistemaSalud: textoOpcional(40),
  isapreNombre: textoOpcional(120),
  planIsapre: textoOpcional(500),
  planUf: z.string().trim().max(20).nullable().optional(),
  cotizacionUfPct: z.string().trim().max(20).nullable().optional(),
});

async function vistaPrevision(
  ctx: Contexto,
  fila: {
    personaId: string;
    afp: string | null;
    regimen: string | null;
    sistemaSalud: string | null;
    isapreNombre: string | null;
    planIsapre: string | null;
    planUf: { toString(): string } | null;
    cotizacionUfPct: { toString(): string } | null;
  } | null,
  personaId: string,
) {
  if (!fila) {
    return {
      personaId,
      afp: null,
      regimen: null,
      sistemaSalud: null,
      isapreNombre: null,
      planIsapre: null,
      planUf: null,
      cotizacionUfPct: null,
    };
  }
  const enmascarar = enmascararPlanIsapreEnLectura(ctx);
  let plan: string | null = null;
  if (fila.planIsapre) {
    if (enmascarar) {
      plan = enmascararPlanIsapre(fila.planIsapre);
    } else {
      plan = await cifradoDeCampos(ctx).descifrar(
        "personas_prevision",
        "plan_isapre",
        fila.planIsapre,
      );
    }
  }
  return {
    personaId: fila.personaId,
    afp: fila.afp ?? null,
    regimen: fila.regimen ?? null,
    sistemaSalud: fila.sistemaSalud ?? null,
    isapreNombre: fila.isapreNombre ?? null,
    planIsapre: plan,
    planUf: fila.planUf?.toString() ?? null,
    cotizacionUfPct: fila.cotizacionUfPct?.toString() ?? null,
  };
}

export const personasPrevisionVer = defineCapability({
  auditarLectura: (s) => [s.personaId],
  id: "core.personas.prevision_ver",
  descripcion:
    "Muestra la previsión social de una persona (AFP, régimen, salud e ISAPRE). Dato reservado de RRHH; el supervisor recibe el plan ISAPRE enmascarado sin descifrar (R-PER-004).",
  permiso: PERMISOS_CORE.personasPrevisionRead,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema }),
  output: previsionSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await personaFicha(ctx, input.id);
    const fila = await ctx.db.personaPrevision.findUnique({ where: { personaId: input.id } });
    return vistaPrevision(ctx, fila, input.id);
  },
});

export const personasPrevisionActualizar = defineCapability({
  id: "core.personas.prevision_actualizar",
  descripcion:
    "Actualiza la previsión social de una persona (AFP, salud, plan ISAPRE). Solo RRHH y administradores; el plan ISAPRE se guarda cifrado.",
  permiso: PERMISOS_CORE.personasPrevisionManage,
  sensibles: ["planIsapre"],
  input: inputPrevision,
  output: previsionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    if (dryRun) {
      const prev = await ctx.db.personaPrevision.findUnique({ where: { personaId: p.id } });
      return vistaPrevision(ctx, { ...(prev ?? { tenantId: p.tenantId, personaId: p.id }), personaId: p.id } as never, p.id);
    }
    const fila = await escribirConEvento(
      ctx,
      { tipo: "core.persona.prevision_actualizada", entidadTipo: "persona" },
      async (tx) => {
        const planCifrado =
          input.planIsapre === undefined
            ? undefined
            : input.planIsapre === null
              ? null
              : await cifrarCampoEnTransaccion(
                  ctx,
                  tx,
                  "personas_prevision",
                  "plan_isapre",
                  input.planIsapre,
                );
        const data = {
          tenantId: p.tenantId,
          personaId: p.id,
          ...(input.afp !== undefined ? { afp: input.afp } : {}),
          ...(input.regimen !== undefined ? { regimen: input.regimen } : {}),
          ...(input.sistemaSalud !== undefined ? { sistemaSalud: input.sistemaSalud } : {}),
          ...(input.isapreNombre !== undefined ? { isapreNombre: input.isapreNombre } : {}),
          ...(planCifrado !== undefined ? { planIsapre: planCifrado } : {}),
          ...(input.planUf !== undefined ? { planUf: input.planUf } : {}),
          ...(input.cotizacionUfPct !== undefined ? { cotizacionUfPct: input.cotizacionUfPct } : {}),
        };
        return tx.personaPrevision.upsert({
          where: { personaId: p.id },
          create: data as never,
          update: data,
        });
      },
    );
    return vistaPrevision(ctx, fila, p.id);
  },
});
