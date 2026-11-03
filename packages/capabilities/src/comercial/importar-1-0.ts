import { z } from "zod";

import {
  aplicarPlanEnTransaccion,
  calcularPlan,
  construirReporte,
  datosOpai1,
  leerEstadoDestinoPorTenantId,
  validarDatos,
} from "@opai/db/importar-opai1";
import { enTransaccion } from "@opai/db";

import { defineCapability } from "../define";
import { prohibido } from "../errores";
import type { Contexto } from "../types";

const reporteSchema = z.object({
  modo: z.literal("simulacion"),
  sistema: z.literal("opai1"),
  tenant: z.string(),
  modulosActivos: z.array(z.string()),
  tributario: z.object({
    cuentasConsideradas: z.number().int(),
    listasParaFacturar: z.number().int(),
    incompletas: z.number().int(),
    faltantesPorCampo: z.record(z.string(), z.number().int()),
  }),
  pendientes: z.array(
    z.object({ entidad: z.string(), filas: z.number().int(), motivo: z.string() }),
  ),
  avisos: z.array(z.object({ codigo: z.string(), idsOpai1: z.array(z.string()) })),
});

const resultadoSchema = z.object({
  dryRun: z.boolean(),
  reporte: reporteSchema,
  aplicadas: z
    .object({
      cuentas: z.number().int(),
      contactos: z.number().int(),
      instalaciones: z.number().int(),
      omitidas: z.number().int(),
    })
    .nullable(),
  usuariosResueltos: z.number().int(),
  usuariosSinMembresia: z.array(z.string()),
});

async function exigirOwnerAdmin(ctx: Contexto) {
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    throw prohibido("Solo owner o admin pueden importar datos desde OPAI 1.0.");
  }
}

async function resolverUsuarios(
  ctx: Contexto,
  usuarios: readonly { id: string; email: string }[],
) {
  let resueltos = 0;
  const sinMembresia: string[] = [];
  for (const u of usuarios) {
    const user = await ctx.db.user.findFirst({
      where: { email: u.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      sinMembresia.push(u.id);
      continue;
    }
    const m = await ctx.db.membership.findFirst({
      where: { tenantId: ctx.tenantId, userId: user.id },
      select: { id: true },
    });
    if (m) resueltos += 1;
    else sinMembresia.push(u.id);
  }
  return { resueltos, sinMembresia };
}

/**
 * Importa cuentas, contactos (N–N) e instalaciones desde un export JSON de OPAI 1.0. Idempotente por
 * `origen_1_0_id` en `core.ids_externos` (sistema `opai1`). No exige integración DTE ni Finanzas.
 */
export const comercialImportar10 = defineCapability({
  id: "comercial.importar_1_0",
  soloPersonas: true,
  descripcion:
    "Importa un export JSON de OPAI 1.0 (cuentas con datos tributarios, contactos con vínculos por cuenta e instalaciones). Idempotente por id de origen; usuarios del JSON se validan por correo contra membresías del tenant. Solo owner o admin; incluye vista previa sin escrituras.",
  permiso: "comercial:config.manage",
  input: z.object({
    origen: datosOpai1,
    usuarios: z
      .array(z.object({ origen1Id: z.string().min(1), email: z.string().email() }))
      .default([]),
  }),
  output: resultadoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await exigirOwnerAdmin(ctx);
    const datos = validarDatos(input.origen);
    const usuarios = [
      ...datos.users.map((u) => ({ id: u.id, email: u.email })),
      ...input.usuarios.map((u) => ({ id: u.origen1Id, email: u.email })),
    ];
    const { resueltos, sinMembresia } = await resolverUsuarios(ctx, usuarios);

    const estado = await leerEstadoDestinoPorTenantId(ctx.tenantId);
    const plan = calcularPlan(datos, estado, { modulosActivos: ctx.modulosActivos });
    const reporte = construirReporte(plan, ctx.tenantId);
    const reporteSalida = {
      ...reporte,
      modulosActivos: [...reporte.modulosActivos],
    };

    if (dryRun) {
      return {
        dryRun: true,
        reporte: reporteSalida,
        aplicadas: null,
        usuariosResueltos: resueltos,
        usuariosSinMembresia: sinMembresia,
      };
    }

    const aplicadas = await enTransaccion(ctx.tenantId, async (tx) =>
      aplicarPlanEnTransaccion(tx, ctx.tenantId, plan),
    );
    return {
      dryRun: false,
      reporte: reporteSalida,
      aplicadas: {
        cuentas: aplicadas.aplicadas.cuentas,
        contactos: aplicadas.aplicadas.contactos,
        instalaciones: aplicadas.aplicadas.instalaciones,
        omitidas: aplicadas.omitidas,
      },
      usuariosResueltos: resueltos,
      usuariosSinMembresia: sinMembresia,
    };
  },
});
