import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { dondeContacto } from "../core/maestros/alcance";
import { sinDuplicado } from "../core/maestros/comun";
import { PERMISO_MANAGE, etapaDe, negocioDe, rolContactoSchema, tipoVinculoSchema } from "./comun";
import { emitirActualizado } from "./validaciones";

const salida = z.object({ negocioId: z.string(), total: z.number() });

export const negociosVincularInstalacion = defineCapability({
  id: "comercial.negocios.vincular_instalacion",
  descripcion:
    "Vincula una instalación de la cuenta del negocio con su tipo (nueva, ampliación, renovación o reemplazo). El negocio lee los datos de la instalación, no los copia (R7).",
  permiso: PERMISO_MANAGE,
  input: z.object({
    negocioId: uuidSchema,
    instalacionId: uuidSchema,
    tipo: tipoVinculoSchema.default("nueva"),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    const inst = await ctx.db.instalacion.findUnique({
      where: { id: input.instalacionId },
      select: { cuentaId: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    if (inst.cuentaId !== negocio.cuentaId)
      throw reglaDeNegocio("La instalación es de otra cuenta.");
    const total = await ctx.db.negocioInstalacion.count({ where: { negocioId: negocio.id } });
    if (dryRun) return { negocioId: negocio.id, total: total + 1 };
    await ctx.transaccion(async (tx) => {
      await sinDuplicado(
        tx.negocioInstalacion.create({
          data: {
            tenantId: ctx.tenantId,
            negocioId: negocio.id,
            instalacionId: input.instalacionId,
            tipo: input.tipo,
          },
        }),
        "Esa instalación ya está vinculada al negocio.",
      );
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: negocio.id,
        payload: { vinculoInstalacion: input.instalacionId },
      });
    });
    return { negocioId: negocio.id, total: total + 1 };
  },
});

export const negociosDesvincularInstalacion = defineCapability({
  id: "comercial.negocios.desvincular_instalacion",
  descripcion:
    "Quita una instalación vinculada a un negocio. No borra la instalación ni su operación; solo deshace el vínculo con este negocio.",
  permiso: PERMISO_MANAGE,
  input: z.object({ negocioId: uuidSchema, instalacionId: uuidSchema }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    const vinculo = { negocioId: negocio.id, instalacionId: input.instalacionId };
    if (!(await ctx.db.negocioInstalacion.count({ where: vinculo }))) {
      throw noEncontrado("El vínculo con esa instalación");
    }
    const total = await ctx.db.negocioInstalacion.count({ where: { negocioId: negocio.id } });
    // R10: pasada la primera etapa, el negocio conserva al menos una instalación.
    if (total === 1 && (await etapaDe(ctx, negocio.etapaId)).orden > 0) {
      throw reglaDeNegocio("Un negocio que ya avanzó de etapa conserva al menos una instalación.");
    }
    if (dryRun) return { negocioId: negocio.id, total: total - 1 };
    await ctx.db.negocioInstalacion.deleteMany({ where: vinculo });
    await emitirActualizado(ctx, negocio.id, { desvinculoInstalacion: input.instalacionId });
    return { negocioId: negocio.id, total: total - 1 };
  },
});

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
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const negocio = await negocioDe(ctx, input.negocioId);
    if (input.contactos.filter((c) => c.esPrincipal).length > 1) {
      throw reglaDeNegocio("Solo un contacto puede ser el principal.");
    }
    const ids = input.contactos.map((c) => c.contactoId);
    if (ids.length) {
      // Alcance por filas (ADR-022): un actor acotado no vincula contactos fuera de su alcance,
      // igual que la ficha (comercial.negocios.get).
      const dela = await ctx.db.contacto.findMany({
        where: { id: { in: ids }, AND: [dondeContacto(ctx)] },
        select: { cuentaId: true },
      });
      if (dela.length !== new Set(ids).size || dela.some((c) => c.cuentaId !== negocio.cuentaId)) {
        throw reglaDeNegocio("Todos los contactos deben ser de la cuenta del negocio.");
      }
    }
    if (dryRun) return { negocioId: negocio.id, total: input.contactos.length };
    await ctx.transaccion(async (tx) => {
      await tx.negocioContacto.deleteMany({ where: { negocioId: negocio.id } });
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
