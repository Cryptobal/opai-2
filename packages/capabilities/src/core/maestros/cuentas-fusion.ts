// Fusionar dos cuentas (CAR-27, BRIEF-CAR-27-fusionar): la que queda recibe todo lo del duplicado,
// con los valores elegidos campo por campo, y el duplicado se borra. Irreversible: los agentes
// reciben APPROVAL_REQUIRED. La vista previa (dryRun) devuelve la comparación y el resumen.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cuentaDe } from "./cuentas-acceso";
import { CAMPOS_FUSION, comparar, valoresFinales, type Lado } from "./cuentas-fusion-campos";
import { CONTEOS_FUSION, CORREOS_REPETIDOS, PASOS_FUSION } from "./cuentas-fusion-sql";

const lado = z.enum(["esta", "duplicado"]);
const conteosSchema = z.object({
  contactos: z.number().int(),
  instalaciones: z.number().int(),
  negocios: z.number().int(),
  documentos: z.number().int(),
  actividad: z.number().int(),
  facturas: z.number().int(),
  referencias: z.number().int(),
});

export const cuentasFusionar = defineCapability({
  id: "core.cuentas.fusionar",
  descripcion:
    "Fusiona una cuenta duplicada en otra: elige qué valor queda en cada campo, mueve contactos, instalaciones, negocios, documentos, actividad y facturas, y borra el duplicado. No se puede deshacer; usa la vista previa para ver la comparación y lo que se mueve.",
  permiso: PERMISOS_CORE.cuentasManage,
  portales: ["erp"],
  input: z.object({
    cuentaId: uuidSchema.describe("Cuenta que queda."),
    duplicadoId: uuidSchema.describe("Cuenta que se fusiona en la anterior y se borra."),
    elegir: z
      .partialRecord(z.enum(CAMPOS_FUSION.map((c) => c.campo) as [string, ...string[]]), lado)
      .default({})
      .describe("Por campo, qué valor queda: «esta» (por defecto) o «duplicado»."),
  }),
  output: z.object({
    cuentaId: z.string(),
    duplicadoId: z.string(),
    comparacion: z.array(
      z.object({
        campo: z.string(),
        etiqueta: z.string(),
        esta: z.string().nullable(),
        duplicado: z.string().nullable(),
        queda: lado,
      }),
    ),
    mueve: conteosSchema,
    aplicada: z.boolean(),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.cuentaId === input.duplicadoId)
      throw reglaDeNegocio("Elige una cuenta distinta para fusionar.");
    const [a, b] = await Promise.all([cuentaDe(ctx, input.cuentaId), cuentaDe(ctx, input.duplicadoId)]);
    const elegir = input.elegir as Partial<Record<string, Lado>>;
    const finales = valoresFinales(a, b, elegir);
    const { mueve, correos } = await ctx.transaccion(async (tx) => {
      const [c] = await tx.$queryRawUnsafe<z.infer<typeof conteosSchema>[]>(CONTEOS_FUSION, b.id);
      const r = await tx.$queryRawUnsafe<{ email: string }[]>(CORREOS_REPETIDOS, a.id, b.id);
      return { mueve: c ?? { contactos: 0, instalaciones: 0, negocios: 0, documentos: 0, actividad: 0, facturas: 0, referencias: 0 }, correos: r.map((x) => x.email) };
    });
    if (correos.length > 0)
      throw reglaDeNegocio(
        `Primero fusiona los contactos con el mismo correo en las dos cuentas: ${correos.join(", ")}.`,
      );
    if (mueve.referencias > 0)
      throw reglaDeNegocio(
        "El duplicado tiene registrado el consentimiento para usarlo como referencia comercial. Ese registro no se mueve: fusiona en sentido contrario (que quede el duplicado).",
      );
    if (mueve.facturas > 0 && b.rut && finales.rut !== b.rut)
      throw reglaDeNegocio(
        "El duplicado tiene facturas emitidas a su RUT. Para fusionar, el RUT que queda debe ser el del duplicado.",
      );
    const salida = { cuentaId: a.id, duplicadoId: b.id, comparacion: comparar(a, b, elegir), mueve };
    if (dryRun) return { ...salida, aplicada: false };

    await ctx.transaccion(async (tx) => {
      if (b.rut && finales.rut === b.rut) await tx.cuenta.update({ where: { id: b.id }, data: { rut: null } });
      for (const sql of PASOS_FUSION) await tx.$executeRawUnsafe(sql, a.id, b.id);
      await tx.cuenta.update({ where: { id: a.id }, data: finales });
      await tx.cuenta.delete({ where: { id: b.id } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cuenta.fusionada",
        entidadTipo: "cuenta",
        entidadId: a.id,
        payload: { duplicadoId: b.id },
      });
    });
    return { ...salida, aplicada: true };
  },
});
