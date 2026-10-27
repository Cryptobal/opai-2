import { z } from "zod";

import { normalizarTelefono, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { definidos, escribirConEvento, textoOpcional } from "../maestros/comun";

// Mensajes en español fijados en el schema del DPO (texto de la sábana, ParteC:195 y C08).
const correo = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresa un correo válido"))
  .nullable()
  .optional();

/** Teléfono chileno o internacional → E.164, con mensaje en español. */
const telefono = z
  .string()
  .trim()
  .transform((v, c) => {
    const t = normalizarTelefono(v);
    if (!t) c.addIssue({ code: "custom", message: "Ingresa un teléfono válido" });
    return t ?? v;
  })
  .nullable()
  .optional();

const dpoSchema = z.object({
  nombre: z.string().nullable(),
  correo: z.string().nullable(),
  telefono: z.string().nullable(),
});

const vista = (p: { dpoNombre?: string | null; dpoCorreo?: string | null; dpoTelefono?: string | null } | null) => ({
  nombre: p?.dpoNombre ?? null,
  correo: p?.dpoCorreo ?? null,
  telefono: p?.dpoTelefono ?? null,
});

export const cumplimientoDpoSet = defineCapability({
  id: "core.cumplimiento.dpo_set",
  descripcion:
    "Fija el contacto del delegado o encargado de protección de datos (DPO) de la empresa: nombre, correo y teléfono (Ley 21.719). Aparece en el pie legal y en los avisos de cumplimiento. Solo cambia lo enviado.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    nombre: textoOpcional(160),
    correo,
    telefono,
  }),
  output: dpoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const data = definidos({
      dpoNombre: input.nombre,
      dpoCorreo: input.correo,
      dpoTelefono: input.telefono,
    });
    if (dryRun) {
      const actual = await ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } });
      return vista({ ...actual, ...data });
    }
    const r = await escribirConEvento(
      ctx,
      {
        tipo: "core.cumplimiento.dpo_actualizado",
        entidadTipo: "perfil_empresa",
        payload: () => ({ campos: Object.keys(data) }),
      },
      (tx) =>
        tx.perfilEmpresa.upsert({
          where: { tenantId: ctx.tenantId },
          create: { ...data, tenantId: ctx.tenantId },
          update: data,
        }),
    );
    return vista(r);
  },
});
