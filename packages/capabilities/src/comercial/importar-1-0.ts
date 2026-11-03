import { z } from "zod";

import { enTransaccion } from "@opai/db";
import {
  aplicarPlanEnTransaccion,
  calcularPlan,
  construirReporte,
  datosOpai1,
  leerEstadoDestinoPorTenantId,
  type Plan,
  validarDatos,
} from "@opai/db/importar-opai1";

import { defineCapability } from "../define";
import { ErrorCapacidad, prohibido } from "../errores";
import { executeCapability } from "../execute";
import type { Contexto } from "../types";
import { resultadoImportar10Schema } from "./importar-1-0-esquemas";

async function fijarCorrelativosCpqDesdePlan(ctx: Contexto, plan: Plan, dryRun: boolean): Promise<number> {
  let n = 0;
  for (const c of plan.correlativosCpq) {
    if (c.omitido) continue;
    const r = await executeCapability(
      ctx,
      "cpq.correlativos.fijar",
      { anio: c.anio, ultimo: c.fijariaUltimo },
      { dryRun },
    );
    if (!r.ok) throw new ErrorCapacidad(r.error.code, r.error.message);
    n += 1;
  }
  return n;
}

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
    "Importa un export JSON de OPAI 1.0 (cuentas con datos tributarios, contactos, instalaciones, plantillas de facturación recurrente con destinatarios y correlativo CPQ por año). Idempotente por id de origen; solo owner o admin; incluye vista previa sin escrituras.",
  permiso: "comercial:config.manage",
  input: z.object({
    origen: datosOpai1,
    usuarios: z
      .array(z.object({ origen1Id: z.string().min(1), email: z.string().email() }))
      .default([]),
  }),
  output: resultadoImportar10Schema,
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
      modo: reporte.modo,
      sistema: reporte.sistema,
      tenant: reporte.tenant,
      modulosActivos: [...reporte.modulosActivos],
      conteos: reporte.conteos,
      omitidas: reporte.omitidas,
      tributario: reporte.tributario,
      destinatarios: reporte.destinatarios,
      correlativosCpq: reporte.correlativosCpq,
      pendientes: reporte.pendientes,
      avisos: reporte.avisos,
    };

    if (dryRun) {
      await fijarCorrelativosCpqDesdePlan(ctx, plan, true);
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
    const correlativosCpq = await fijarCorrelativosCpqDesdePlan(ctx, plan, false);
    return {
      dryRun: false,
      reporte: reporteSalida,
      aplicadas: {
        cuentas: aplicadas.aplicadas.cuentas,
        contactos: aplicadas.aplicadas.contactos,
        instalaciones: aplicadas.aplicadas.instalaciones,
        programaciones: aplicadas.aplicadas.programaciones,
        correlativosCpq,
        omitidas: aplicadas.omitidas,
      },
      usuariosResueltos: resueltos,
      usuariosSinMembresia: sinMembresia,
    };
  },
});
