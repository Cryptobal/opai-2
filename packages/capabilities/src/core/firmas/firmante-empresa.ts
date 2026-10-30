import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { nivelDisponibleSchema, PERMISO_FIRMAS_CONFIG } from "./comun";

export const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

const firmanteEmpresaSchema = z.object({
  id: z.string(),
  usuarioId: z.string(),
  nombre: z.string(),
  run: z.string().nullable(),
  cargo: z.string().nullable(),
  nivelMaximo: z.string().nullable(),
  activo: z.boolean(),
});

export const autorizacionSchema = z.object({
  id: z.string(),
  firmanteEmpresaId: z.string(),
  clase: z.string(),
  vigenciaDesde: z.string(),
  vigenciaHasta: z.string().nullable(),
  revocadaEn: z.string().nullable(),
});

/** Representante legal u otro firmante autorizado del tenant (R16). Solo lo gobierna una persona. */
export const firmasFirmanteEmpresaSet = defineCapability({
  id: "core.firmas.firmante_empresa_set",
  // Solo personas: define quién firma por la empresa; gobierna la identidad de firma, no una key.
  soloPersonas: true,
  descripcion:
    "Registra o actualiza un firmante de la empresa (representante legal u otro autorizado del tenant) con su RUN, cargo y nivel máximo, para firmar documentos o habilitar la firma automática (R16).",
  permiso: PERMISO_FIRMAS_CONFIG,
  input: z.object({
    usuarioId: uuidSchema,
    nombre: z.string().trim().min(3).max(120),
    run: z.string().trim().max(12).nullable().optional(),
    cargo: z.string().trim().max(80).nullable().optional(),
    nivelMaximo: nivelDisponibleSchema.nullable().optional(),
    activo: z.boolean().default(true),
  }),
  output: firmanteEmpresaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const miembro = await ctx.db.membership.findFirst({
      where: { userId: input.usuarioId, estado: "activa" },
    });
    if (!miembro) throw noEncontrado("El usuario de la empresa");
    const datos = {
      nombre: input.nombre,
      run: input.run ?? null,
      cargo: input.cargo ?? null,
      nivelMaximo: input.nivelMaximo ?? null,
      activo: input.activo,
    };
    if (dryRun) return { id: "", usuarioId: input.usuarioId, ...datos };
    const f = await ctx.transaccion((tx) =>
      tx.firmanteEmpresa.upsert({
        where: { tenantId_usuarioId: { tenantId: ctx.tenantId, usuarioId: input.usuarioId } },
        create: { tenantId: ctx.tenantId, usuarioId: input.usuarioId, ...datos },
        update: datos,
      }),
    );
    return { ...f, run: f.run, cargo: f.cargo, nivelMaximo: f.nivelMaximo };
  },
});
