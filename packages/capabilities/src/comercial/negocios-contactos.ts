import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { dondeContacto } from "../core/maestros/alcance";
import type { Contexto } from "../types";
import { PERMISO_MANAGE, negocioDe, rolContactoSchema } from "./comun";

/** Ids de `ids` que el actor puede ver como contactos: alcance por filas (ADR-022). */
async function visibles(ctx: Contexto, ids: string[]) {
  if (!ids.length) return [];
  return ctx.db.contacto.findMany({
    where: { id: { in: ids }, AND: [dondeContacto(ctx)] },
    select: { id: true, cuentaId: true },
  });
}

export const negociosSetContactos = defineCapability({
  id: "comercial.negocios.set_contactos",
  descripcion:
    "Define los contactos del negocio con su rol (decisor, técnico, compras o usuario) y cuál es el principal; reemplaza el conjunto actual. Solo contactos de la cuenta del negocio (R16).",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    contactos: z
      .array(
        z.object({
          contactoId: uuidSchema,
          rol: rolContactoSchema,
          esPrincipal: z.boolean().default(false),
        }),
      )
      .max(50),
  }),
  output: z.object({ negocioId: z.string(), total: z.number() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // Contactos: datos personales del núcleo. Como la ficha y comercial.contactos.list, exige ver
    // Cuentas y solo opera sobre los contactos del alcance del actor.
    if (!ctx.autorizar(PERMISOS_CORE.cuentasRead))
      throw prohibido("Sin permiso para ver contactos.");
    const negocio = await negocioDe(ctx, input.negocioId);
    const ids = input.contactos.map((c) => c.contactoId);
    if (new Set(ids).size !== ids.length) throw reglaDeNegocio("Hay contactos repetidos.");
    if (input.contactos.filter((c) => c.esPrincipal).length > 1) {
      throw reglaDeNegocio("Solo un contacto puede ser el principal.");
    }
    // Fuera del alcance responde igual que inexistente: no confirma que el contacto exista.
    const dela = await visibles(ctx, ids);
    if (dela.length !== ids.length || dela.some((c) => c.cuentaId !== negocio.cuentaId)) {
      throw reglaDeNegocio("Todos los contactos deben ser de la cuenta del negocio.");
    }
    // El reemplazo solo toca los vínculos que el actor ve; los ocultos se conservan intactos.
    const actuales = await ctx.db.negocioContacto.findMany({ where: { negocioId: negocio.id } });
    const vistos = new Set(
      (
        await visibles(
          ctx,
          actuales.map((v) => v.contactoId),
        )
      ).map((c) => c.id),
    );
    const ocultos = actuales.filter((v) => !vistos.has(v.contactoId));
    if (input.contactos.some((c) => c.esPrincipal) && ocultos.some((v) => v.esPrincipal)) {
      throw reglaDeNegocio("No se puede cambiar el contacto principal de este negocio.");
    }
    if (dryRun) return { negocioId: negocio.id, total: input.contactos.length };
    await ctx.transaccion(async (tx) => {
      await tx.negocioContacto.deleteMany({
        where: { negocioId: negocio.id, contactoId: { notIn: ocultos.map((v) => v.contactoId) } },
      });
      for (const c of input.contactos) {
        await tx.negocioContacto.create({
          data: {
            tenantId: ctx.tenantId,
            negocioId: negocio.id,
            contactoId: c.contactoId,
            rol: c.rol,
            esPrincipal: c.esPrincipal,
          },
        });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: negocio.id,
        payload: { contactos: input.contactos.length },
      });
    });
    return { negocioId: negocio.id, total: input.contactos.length };
  },
});
