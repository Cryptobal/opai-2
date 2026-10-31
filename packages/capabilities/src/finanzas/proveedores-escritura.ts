import { z } from "zod";

import { defineCapability } from "../define";
import { rutSchema, textoOpcional, telefonoSchema } from "../core/maestros/comun";
import { uuidSchema } from "../core/esquemas";
import { definidos, escribirConEvento, sinDuplicado } from "../core/maestros/comun";
import { conflicto, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import {
  PERMISO_PROVEEDORES,
  centroDe,
  centroRefSchema,
  plazoPagoDefecto,
  proveedorDe,
} from "./comun";
import { proveedorSchema, vistaProveedor } from "./vistas";

const campos = {
  giro: textoOpcional(120),
  email: z.string().trim().toLowerCase().pipe(z.email()).nullable().optional(),
  telefono: telefonoSchema.nullable().optional(),
  plazoPagoDias: z.number().int().min(0).max(365).optional().describe("Días de crédito; por defecto el del tenant."),
  cuentaGastoId: uuidSchema.nullable().optional().describe("Cuenta de gasto o costo por defecto."),
  cuentaPorPagarId: uuidSchema.nullable().optional().describe("Cuenta de pasivo por defecto (proveedores)."),
  centro: centroRefSchema.nullable().optional().describe("Centro de costo por defecto."),
  notas: textoOpcional(500),
};

/** Las cuentas por defecto existen en el plan, y son del tipo que corresponde. */
async function validarCuentas(ctx: Contexto, gastoId?: string | null, pagarId?: string | null) {
  const ids = [gastoId, pagarId].filter((x): x is string => !!x);
  if (!ids.length) return;
  const filas = await ctx.db.cuentaContable.findMany({ where: { id: { in: ids } } });
  const gasto = filas.find((c) => c.id === gastoId);
  const pagar = filas.find((c) => c.id === pagarId);
  if (gastoId && (!gasto || !["gasto", "costo"].includes(gasto.tipo)))
    throw reglaDeNegocio("La cuenta de gasto por defecto debe ser una cuenta de gasto o de costo del plan.");
  if (pagarId && (!pagar || pagar.tipo !== "pasivo"))
    throw reglaDeNegocio("La cuenta por pagar por defecto debe ser una cuenta de pasivo del plan.");
}

export const proveedoresCrear = defineCapability({
  id: "finanzas.proveedores.crear",
  descripcion:
    "Crea un proveedor del tenant con su RUT, razón social, plazo de pago, cuenta de gasto y por pagar por defecto y centro de costo por defecto. Las compras nuevas de ese proveedor heredan estos valores como sugerencia.",
  permiso: PERMISO_PROVEEDORES,
  input: z.object({ rut: rutSchema, razonSocial: z.string().trim().min(2).max(160), ...campos }),
  output: proveedorSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (await ctx.db.proveedor.findFirst({ where: { rut: input.rut }, select: { id: true } }))
      throw conflicto("Ya existe un proveedor con ese RUT.");
    await validarCuentas(ctx, input.cuentaGastoId, input.cuentaPorPagarId);
    const centro = input.centro ? await centroDe(ctx, input.centro, !dryRun) : null;
    const data = {
      rut: input.rut,
      razonSocial: input.razonSocial,
      giro: input.giro ?? null,
      email: input.email ?? null,
      telefono: input.telefono ?? null,
      plazoPagoDias: input.plazoPagoDias ?? (await plazoPagoDefecto(ctx)),
      cuentaGastoId: input.cuentaGastoId ?? null,
      cuentaPorPagarId: input.cuentaPorPagarId ?? null,
      centroCostoId: centro?.id ?? null,
      notas: input.notas ?? null,
      activo: true,
    };
    if (dryRun) return vistaProveedor({ ...data, id: "" });
    const fila = await sinDuplicado(
      escribirConEvento(ctx, { tipo: "finanzas.proveedor.creado", entidadTipo: "proveedor" }, (tx) =>
        tx.proveedor.create({ data: { ...data, tenantId: ctx.tenantId } }),
      ),
      "Ya existe un proveedor con ese RUT.",
    );
    return vistaProveedor(fila);
  },
});

export const proveedoresActualizar = defineCapability({
  id: "finanzas.proveedores.actualizar",
  descripcion:
    "Edita un proveedor: razón social, contacto, plazo de pago, cuentas y centro de costo por defecto, o lo desactiva. No cambia el RUT. Desactivarlo no borra sus compras.",
  permiso: PERMISO_PROVEEDORES,
  input: z.object({
    id: uuidSchema,
    razonSocial: z.string().trim().min(2).max(160).optional(),
    activo: z.boolean().optional(),
    ...campos,
  }),
  output: proveedorSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, centro, ...cambios }, { dryRun }) {
    const actual = await proveedorDe(ctx, id);
    await validarCuentas(ctx, cambios.cuentaGastoId, cambios.cuentaPorPagarId);
    const centroResuelto = centro ? await centroDe(ctx, centro, !dryRun) : null;
    const data = definidos({
      ...cambios,
      ...(centro !== undefined ? { centroCostoId: centroResuelto?.id ?? null } : {}),
    });
    if (dryRun) return vistaProveedor({ ...actual, ...data });
    const fila = await escribirConEvento(
      ctx,
      { tipo: "finanzas.proveedor.actualizado", entidadTipo: "proveedor" },
      (tx) => tx.proveedor.update({ where: { id }, data }),
    );
    return vistaProveedor(fila);
  },
});
