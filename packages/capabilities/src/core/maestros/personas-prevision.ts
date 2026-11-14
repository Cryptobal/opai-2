import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { cifrarCampoEnTransaccion } from "../cumplimiento/cifrado-campos";
import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "./comun";
import { personaFicha } from "./personas-ficha-comun";
import { COLUMNAS_PREVISION } from "./personas-prevision-input";
import { CAMPOS_CIFRADOS } from "./personas-prevision-cifrado";
import { inputPrevision, previsionSchema, vistaPrevision } from "./personas-prevision-vista";

export const personasPrevisionVer = defineCapability({
  auditarLectura: (s) => [s.personaId],
  id: "core.personas.prevision_ver",
  descripcion:
    "Muestra la previsión social de una persona: AFP, régimen, pensión, salud e ISAPRE, qué cotiza, APV, asignación familiar y discapacidad. Dato reservado de RRHH; el supervisor recibe el plan ISAPRE enmascarado y los datos sensibles ocultos (R-PER-004).",
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
    "Actualiza la previsión social de una persona: AFP y régimen (códigos del catálogo), pensión, salud e ISAPRE, qué cotiza, APV, tramo y cargas de asignación familiar y discapacidad. Solo RRHH y administradores; el plan ISAPRE, el tipo de pensión y la discapacidad se guardan cifrados.",
  permiso: PERMISOS_CORE.personasPrevisionManage,
  sensibles: ["planIsapre", "tipoPension", "discapacidadInvalidez"],
  input: inputPrevision,
  output: previsionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = await personaFicha(ctx, input.id);
    if (dryRun) {
      const prev = await ctx.db.personaPrevision.findUnique({ where: { personaId: p.id } });
      return vistaPrevision(
        ctx,
        { ...(prev ?? { tenantId: p.tenantId, personaId: p.id }), personaId: p.id } as never,
        p.id,
      );
    }
    const fila = await escribirConEvento(
      ctx,
      { tipo: "core.persona.prevision_actualizada", entidadTipo: "persona" },
      async (tx) => {
        // Datos de salud cifrados con la DEK de la empresa (plan ISAPRE; CAR-411: tipo de pensión y discapacidad).
        const cifrados: Record<string, string | null> = {};
        for (const [k, col] of Object.entries(CAMPOS_CIFRADOS)) {
          const v = input[k as keyof typeof CAMPOS_CIFRADOS];
          if (v === undefined) continue;
          cifrados[k] =
            v === null
              ? null
              : await cifrarCampoEnTransaccion(ctx, tx, "personas_prevision", col, v);
        }
        const copia = Object.fromEntries(
          COLUMNAS_PREVISION.filter((k) => input[k] !== undefined && !(k in CAMPOS_CIFRADOS)).map(
            (k) => [k, input[k]],
          ),
        );
        const data = { tenantId: p.tenantId, personaId: p.id, ...copia, ...cifrados };
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
