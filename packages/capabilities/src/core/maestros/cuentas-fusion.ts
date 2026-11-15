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
import { BLOQUEAR_CUENTAS, CONTEOS_FUSION, CORREOS_REPETIDOS, PASOS_FUSION } from "./cuentas-fusion-sql";
import { SIN_CONTEOS, validarFusion, type Conteos } from "./cuentas-fusion-reglas";

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
    // Alcance (ADR-022): las dos cuentas deben ser visibles para quien fusiona.
    await Promise.all([cuentaDe(ctx, input.cuentaId), cuentaDe(ctx, input.duplicadoId)]);
    const elegir = input.elegir as Partial<Record<string, Lado>>;
    // Todo en una transacción: bloquea ambas cuentas, relee, valida y recién entonces escribe. Así
    // nada cambia entre la validación y la escritura, y dos fusiones cruzadas se esperan en orden.
    return ctx.transaccion(async (tx) => {
      await tx.$queryRawUnsafe(BLOQUEAR_CUENTAS, input.cuentaId, input.duplicadoId);
      const [a, b] = await Promise.all([
        tx.cuenta.findFirst({ where: { id: input.cuentaId } }),
        tx.cuenta.findFirst({ where: { id: input.duplicadoId } }),
      ]);
      if (!a || !b) throw reglaDeNegocio("Una de las cuentas ya no existe; recarga la ficha.");
      const finales = valoresFinales(a, b, elegir);
      const [c] = await tx.$queryRawUnsafe<Conteos[]>(CONTEOS_FUSION, b.id, a.id);
      const correos = await tx.$queryRawUnsafe<{ email: string }[]>(CORREOS_REPETIDOS, a.id, b.id);
      const { facturasQueda, ...mueve } = c ?? SIN_CONTEOS;
      validarFusion({ a, b, rutFinal: finales.rut, mueve, facturasQueda, correos: correos.map((x) => x.email) });
      const salida = { cuentaId: a.id, duplicadoId: b.id, comparacion: comparar(a, b, elegir), mueve };
      if (dryRun) return { ...salida, aplicada: false };
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
      return { ...salida, aplicada: true };
    });
  },
});
