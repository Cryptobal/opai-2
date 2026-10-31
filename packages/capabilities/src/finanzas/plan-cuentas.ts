import { z } from "zod";

import {
  type CuentaPlan,
  CLAVES_SISTEMA,
  GRUPOS_CUENTA,
  NATURALEZAS,
  NATURALEZA_HABITUAL,
  TIPOS_CUENTA,
} from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { definidos, escribirConEvento, sinDuplicado } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_PLAN, cuentaDe } from "./comun";
import { aPlan, exigirValida, leerPlan } from "./plan-lectura";
import { cuentaSchema, vistaCuenta } from "./vistas";

const nombreCuenta = z.string().trim().min(2).max(120);

const camposCuenta = {
  grupo: z.enum(GRUPOS_CUENTA).nullable().optional().describe("Solo activos y pasivos: corriente o no corriente."),
  exigeCentroCosto: z.boolean().optional(),
  aceptaAsientos: z.boolean().optional().describe("Falso en los títulos que solo agrupan cuentas."),
  claveSistema: z
    .enum(CLAVES_SISTEMA)
    .nullable()
    .optional()
    .describe("Rol contable de la cuenta (deudores_por_venta, iva_credito…); se valida su grupo."),
};

export const planCrear = defineCapability({
  id: "finanzas.plan.crear",
  descripcion:
    "Crea una cuenta en el plan de cuentas del tenant, con su código, tipo, naturaleza, grupo corriente o no corriente y si exige centro de costo. Rechaza grupos incorrectos, como deudores por venta o IVA en el grupo equivocado.",
  permiso: PERMISO_PLAN,
  input: z.object({
    codigo: z.string().trim().regex(/^[0-9][0-9.]{0,19}$/, "Código numérico con puntos, como 1.1.05."),
    tipo: z.enum(TIPOS_CUENTA),
    naturaleza: z.enum(NATURALEZAS).optional().describe("Por defecto, la habitual del tipo."),
    padreId: uuidSchema.nullable().optional(),
    nombre: nombreCuenta,
    ...camposCuenta,
  }),
  output: cuentaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const filas = await leerPlan(ctx);
    const padre = input.padreId ? filas.find((f) => f.id === input.padreId) : undefined;
    if (input.padreId && !padre) throw reglaDeNegocio("La cuenta padre no existe.");
    const nueva: CuentaPlan = {
      codigo: input.codigo,
      nombre: input.nombre,
      tipo: input.tipo,
      naturaleza: input.naturaleza ?? NATURALEZA_HABITUAL[input.tipo],
      grupo: input.grupo ?? null,
      exigeCentroCosto: input.exigeCentroCosto ?? false,
      aceptaAsientos: input.aceptaAsientos ?? true,
      padreCodigo: padre?.codigo ?? null,
      claveSistema: input.claveSistema ?? null,
      activa: true,
    };
    exigirValida([...aPlan(filas), nueva], nueva.codigo);
    const data = {
      codigo: nueva.codigo,
      nombre: nueva.nombre,
      tipo: nueva.tipo,
      naturaleza: nueva.naturaleza,
      grupo: nueva.grupo,
      exigeCentroCosto: nueva.exigeCentroCosto,
      aceptaAsientos: nueva.aceptaAsientos,
      padreId: padre?.id ?? null,
      claveSistema: nueva.claveSistema,
    };
    if (dryRun) return vistaCuenta({ ...data, id: "", activa: true });
    const fila = await sinDuplicado(
      escribirConEvento(
        ctx,
        { tipo: "finanzas.plan.cuenta_creada", entidadTipo: "cuenta_contable" },
        (tx) => tx.cuentaContable.create({ data: { ...data, tenantId: ctx.tenantId } }),
      ),
      "Ya existe una cuenta con ese código o con ese rol contable.",
    );
    return vistaCuenta(fila);
  },
});

export const planActualizar = defineCapability({
  id: "finanzas.plan.actualizar",
  descripcion:
    "Edita una cuenta del plan: nombre, naturaleza, grupo corriente o no corriente, si exige centro de costo, si acepta asientos, su rol contable o si está activa. No cambia el código, el tipo ni el padre. Rechaza grupos incorrectos.",
  permiso: PERMISO_PLAN,
  input: z.object({
    id: uuidSchema,
    naturaleza: z.enum(NATURALEZAS).optional(),
    activa: z.boolean().optional(),
    nombre: nombreCuenta.optional(),
    ...camposCuenta,
  }),
  output: cuentaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const filas = await leerPlan(ctx);
    const actual = filas.find((f) => f.id === id) ?? (await cuentaDe(ctx, id));
    const data = definidos(cambios);
    const plan = aPlan(filas);
    const previa = plan.find((c) => c.codigo === actual.codigo);
    if (!previa) throw noEncontrado("La cuenta contable");
    // La cuenta cambiada va al final: si repite un rol contable, el error es suyo y no de la otra.
    const futura: CuentaPlan = { ...previa, ...data };
    exigirValida([...plan.filter((c) => c.codigo !== previa.codigo), futura], futura.codigo);
    if (data.activa === false && filas.some((f) => f.padreId === id && f.activa))
      throw reglaDeNegocio("La cuenta tiene cuentas activas debajo: desactívalas primero.");
    if (dryRun) return vistaCuenta({ ...actual, ...data });
    const fila = await sinDuplicado(
      escribirConEvento(
        ctx,
        { tipo: "finanzas.plan.cuenta_actualizada", entidadTipo: "cuenta_contable" },
        (tx) => tx.cuentaContable.update({ where: { id }, data }),
      ),
      "Otra cuenta ya cumple ese rol contable.",
    );
    return vistaCuenta(fila);
  },
});
