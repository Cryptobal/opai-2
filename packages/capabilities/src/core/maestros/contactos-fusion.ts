// Fusionar dos contactos (CAR-27, F3): el que queda recibe vínculos con cuentas, negocios, actividad,
// etiquetas, documentos, firmas y correos del duplicado, con los datos elegidos campo por campo, y el
// duplicado se borra. Irreversible: los agentes reciben APPROVAL_REQUIRED.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { CAMPOS_FUSION_CONTACTO, compararContactos, valoresContacto, type Lado } from "./contactos-fusion-campos";
import {
  BLOQUEAR_CONTACTOS,
  CONTEOS_FUSION_CONTACTOS,
  CUENTAS_PRINCIPAL_HEREDADO,
  HEREDAR_PRINCIPAL,
  PASOS_FUSION_CONTACTOS,
} from "./contactos-fusion-sql";
import { contactoDe } from "./contactos-vista";

const lado = z.enum(["este", "duplicado"]);
const conteos = z.object({
  cuentas: z.number().int(),
  negocios: z.number().int(),
  actividad: z.number().int(),
  documentos: z.number().int(),
  firmas: z.number().int(),
  referencias: z.number().int(),
});

export const contactosFusionar = defineCapability({
  id: "core.contactos.fusionar",
  descripcion:
    "Fusiona un contacto duplicado en otro: elige qué dato queda en cada campo, pasa sus cuentas, negocios, actividad, etiquetas, documentos, firmas y correos al que queda, y borra el duplicado. No se puede deshacer; usa la vista previa.",
  permiso: PERMISOS_CORE.cuentasManage,
  portales: ["erp"],
  input: z.object({
    contactoId: uuidSchema.describe("Contacto que queda."),
    duplicadoId: uuidSchema.describe("Contacto que se fusiona en el anterior y se borra."),
    elegir: z
      .partialRecord(z.enum(CAMPOS_FUSION_CONTACTO.map((c) => c.campo) as [string, ...string[]]), lado)
      .default({})
      .describe("Por campo, qué dato queda: «este» (por defecto) o «duplicado»."),
  }),
  output: z.object({
    contactoId: z.string(),
    duplicadoId: z.string(),
    comparacion: z.array(
      z.object({ campo: z.string(), etiqueta: z.string(), este: z.string().nullable(), duplicado: z.string().nullable(), queda: lado }),
    ),
    mueve: conteos,
    aplicada: z.boolean(),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.contactoId === input.duplicadoId)
      throw reglaDeNegocio("Elige un contacto distinto para fusionar.");
    await Promise.all([contactoDe(ctx, input.contactoId), contactoDe(ctx, input.duplicadoId)]);
    const elegir = input.elegir as Partial<Record<string, Lado>>;
    return ctx.transaccion(async (tx) => {
      await tx.$queryRawUnsafe(BLOQUEAR_CONTACTOS, input.contactoId, input.duplicadoId);
      const [a, b] = await Promise.all([
        tx.contacto.findFirst({ where: { id: input.contactoId } }),
        tx.contacto.findFirst({ where: { id: input.duplicadoId } }),
      ]);
      if (!a || !b) throw reglaDeNegocio("Uno de los contactos ya no existe; recarga la ficha.");
      const [c] = await tx.$queryRawUnsafe<z.infer<typeof conteos>[]>(CONTEOS_FUSION_CONTACTOS, b.id);
      const mueve = c ?? { cuentas: 0, negocios: 0, actividad: 0, documentos: 0, firmas: 0, referencias: 0 };
      if (mueve.referencias > 0)
        throw reglaDeNegocio(
          "El duplicado firmó un consentimiento de referencia comercial. Ese registro no se mueve: fusiona en sentido contrario (que quede el duplicado).",
        );
      const finales = valoresContacto(a, b, elegir);
      const salida = { contactoId: a.id, duplicadoId: b.id, comparacion: compararContactos(a, b, elegir), mueve };
      if (dryRun) return { ...salida, aplicada: false };

      const heredar = await tx.$queryRawUnsafe<{ id: string }[]>(CUENTAS_PRINCIPAL_HEREDADO, a.id, b.id);
      if (b.email && finales.email === b.email) await tx.contacto.update({ where: { id: b.id }, data: { email: null } });
      for (const sql of PASOS_FUSION_CONTACTOS) await tx.$executeRawUnsafe(sql, a.id, b.id);
      if (heredar.length) await tx.$executeRawUnsafe(HEREDAR_PRINCIPAL, a.id, heredar.map((h) => h.id));
      await tx.contacto.update({ where: { id: a.id }, data: finales });
      await tx.contacto.delete({ where: { id: b.id } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.contacto.fusionado",
        entidadTipo: "contacto",
        entidadId: a.id,
        payload: { duplicadoId: b.id },
      });
      return { ...salida, aplicada: true };
    });
  },
});
