import { z } from "zod";

import {
  aplicarPlanEnTransaccion,
  bloquearAplicarPorEtapas,
  calcularPlan,
  conciliar,
  construirReporte,
  datosOpai1,
  leerEstadoDestinoPorTenantId,
  registrarCorrida,
  revertirCorrida,
  tenantImportacionCerrada,
  validarDatos,
  cerrarCorrida,
} from "@opai/db/importar-opai1";
import { enTransaccion } from "@opai/db";

import { prohibido } from "../errores";
import type { Contexto } from "../types";
import type { Plan } from "@opai/db/importar-opai1";

const accionImport = z.enum(["simular", "aplicar", "conciliar", "revertir"]);

export const inputImportar10 = z.object({
  accion: accionImport.default("simular"),
  origen: datosOpai1.optional(),
  importacionId: z.string().uuid().optional(),
  permitirReimportacion: z.boolean().default(false),
  usuarios: z
    .array(z.object({ origen1Id: z.string().min(1), email: z.string().email() }))
    .default([]),
});

export async function exigirOwnerAdmin(ctx: Contexto) {
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    throw prohibido("Solo owner o admin pueden importar datos desde OPAI 1.0.");
  }
}

export async function resolverUsuarios(
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

export async function ejecutarImportar10(
  ctx: Contexto,
  input: z.infer<typeof inputImportar10>,
  dryRun: boolean,
  idempotencyKey?: string,
) {
  void idempotencyKey;
  await exigirOwnerAdmin(ctx);

  if (input.accion === "revertir") {
    if (!input.importacionId) throw prohibido("Falta importacionId para revertir.");
    const rev = await enTransaccion(ctx.tenantId, (tx) =>
      revertirCorrida(tx, ctx.tenantId, input.importacionId!, dryRun),
    );
    return {
      dryRun,
      accion: "revertir" as const,
      revertir: rev,
      reporte: null,
      aplicadas: null,
      conciliacion: null,
      usuariosResueltos: 0,
      usuariosSinMembresia: [],
    };
  }

  if (!input.origen) throw prohibido("Falta origen JSON para simular, aplicar o conciliar.");
  const datos = validarDatos(input.origen);
  const usuarios = [
    ...datos.users.map((u) => ({ id: u.id, email: u.email })),
    ...input.usuarios.map((u) => ({ id: u.origen1Id, email: u.email })),
  ];
  const { resueltos, sinMembresia } = await resolverUsuarios(ctx, usuarios);

  const estado = await leerEstadoDestinoPorTenantId(ctx.tenantId);
  const tenant = await ctx.db.tenant.findFirst({
    where: { id: ctx.tenantId },
    select: { slug: true },
  });
  let plan: Plan = calcularPlan(datos, estado, {
    modulosActivos: ctx.modulosActivos,
    ...(tenant?.slug ? { tenantSlug: tenant.slug } : {}),
  });

  if (input.accion === "conciliar") {
    const c = conciliar(datos, plan);
    return {
      dryRun: true,
      accion: "conciliar" as const,
      conciliacion: c,
      reporte: construirReporte(plan, ctx.tenantId),
      aplicadas: null,
      revertir: null,
      usuariosResueltos: resueltos,
      usuariosSinMembresia: sinMembresia,
    };
  }

  if (input.accion === "aplicar" && bloquearAplicarPorEtapas(plan.etapasSinMapear)) {
    throw prohibido("Hay etapas sin equivalencia; corrija la tabla antes de aplicar.");
  }

  const reporte = construirReporte(plan, ctx.tenantId);

  if (input.accion === "simular" || dryRun) {
    return {
      dryRun: true,
      accion: "simular" as const,
      reporte,
      aplicadas: null,
      conciliacion: null,
      revertir: null,
      usuariosResueltos: resueltos,
      usuariosSinMembresia: sinMembresia,
    };
  }

  const cerrada = await enTransaccion(ctx.tenantId, (tx) => tenantImportacionCerrada(tx, ctx.tenantId));
  if (cerrada && !input.permitirReimportacion) {
    throw prohibido("Importación cerrada en este tenant. Use permitirReimportacion si corresponde.");
  }

  const aplicadas = await enTransaccion(ctx.tenantId, async (tx) => {
    const importacionId = await registrarCorrida(tx, {
      tenantId: ctx.tenantId,
      modo: "aplicar",
      lanzadoPorId: ctx.usuario?.id ?? null,
    });
    const r = await aplicarPlanEnTransaccion(tx, ctx.tenantId, plan, importacionId);
    await cerrarCorrida(tx, importacionId, {
      creados: r.aplicadas.cuentas + r.aplicadas.contactos + r.aplicadas.instalaciones,
      completados: 0,
      sinCambio: 0,
      omitidos: r.omitidas,
    }, "completada");
    plan = { ...plan, importacionId };
    return { ...r, importacionId };
  });

  return {
    dryRun: false,
    accion: "aplicar" as const,
    reporte: construirReporte(plan, ctx.tenantId),
    conciliacion: null,
    revertir: null,
    aplicadas: {
      cuentas: aplicadas.aplicadas.cuentas,
      contactos: aplicadas.aplicadas.contactos,
      instalaciones: aplicadas.aplicadas.instalaciones,
      omitidas: aplicadas.omitidas,
      importacionId: aplicadas.importacionId,
    },
    usuariosResueltos: resueltos,
    usuariosSinMembresia: sinMembresia,
  };
}
