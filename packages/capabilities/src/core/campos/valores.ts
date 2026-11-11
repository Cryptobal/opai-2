import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { finalidadSchema } from "./comun";
import { MAX_INSTALACIONES, registroSchema, resolverCamposDocumento } from "./valores-resolver";

export const camposValores = defineCapability({
  // Revela datos de personas (contacto): se audita cada entidad entregada, sin copiar valores.
  auditarLectura: (s) =>
    [
      s.origen.cuentaId,
      s.origen.contactoId,
      ...s.origen.instalacionIds,
      ...s.origen.referenciaCuentaIds,
    ].filter((id): id is string => typeof id === "string"),
  id: "core.campos.valores",
  descripcion:
    "Entrega los valores del catálogo único de campos para un documento (propuesta, contrato, documento o correo) de una cuenta, su contacto, sus instalaciones y los clientes que consintieron ser referencia. Solo devuelve campos que la finalidad permite y que el actor puede leer; lo que falta queda nulo y no se inventa.",
  permiso: PERMISOS_CORE.cuentasRead,
  portales: ["erp", "supervisor"],
  input: z.object({
    finalidad: finalidadSchema,
    cuentaId: uuidSchema,
    contactoId: uuidSchema.optional(),
    instalacionIds: z.array(uuidSchema).max(MAX_INSTALACIONES).optional(),
  }),
  output: z.object({
    version: z.number(),
    finalidad: finalidadSchema,
    campos: registroSchema,
    colecciones: z.object({
      instalaciones: z.array(registroSchema),
      /** Clientes activos con consentimiento vigente de referencia (nunca la cuenta destinataria). */
      referencias: z.array(registroSchema),
    }),
    origen: z.object({
      cuentaId: z.string(),
      contactoId: z.string().nullable(),
      instalacionIds: z.array(z.string()),
      referenciaCuentaIds: z.array(z.string()),
    }),
    /** Claves que la finalidad declara y el actor no puede leer, o que aún no tienen resolvedor. */
    sinPermiso: z.array(z.string()),
    sinResolvedor: z.array(z.string()),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    return resolverCamposDocumento(ctx, input);
  },
});
