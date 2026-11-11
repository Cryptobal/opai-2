import type { z } from "zod";

import {
  aplicarPorLotes,
  bloquearAplicarPorEtapas,
  calcularPlan,
  cerrarCorrida,
  conciliar,
  construirReporte,
  exigirImportacionAbierta,
  ImportacionCerradaError,
  iniciarCorrida,
  leerEstadoDestinoPorTenantId,
  revertirCorrida,
  validarDatos,
  type DatosOpai1,
  type Plan,
} from "@opai/db/importar-opai1";

import { prohibido } from "../errores";
import type { inputImportar10 } from "./importar-1-0-entrada";
import type { Contexto } from "../types";
import { exigirOwnerAdmin, resolverUsuarios } from "./importar-1-0-usuarios";

export async function ejecutarImportar10(
  ctx: Contexto,
  input: z.infer<typeof inputImportar10>,
  dryRun: boolean,
  idempotencyKey?: string,
  traido?: DatosOpai1,
) {
  void idempotencyKey;
  await exigirOwnerAdmin(ctx);

  if (input.accion === "revertir") {
    if (!input.importacionId) throw prohibido("Falta importacionId para revertir.");
    const rev = await revertirCorrida(ctx.tenantId, input.importacionId, dryRun);
    return {
      dryRun,
      accion: "revertir" as const,
      revertir: {
        revertidos: rev.revertida ? rev.porRevertir.creadas + rev.porRevertir.completadas : 0,
        bloqueados: rev.bloqueadas,
      },
      reporte: null,
      aplicadas: null,
      conciliacion: null,
      usuariosResueltos: 0,
      usuariosSinMembresia: [] as string[],
    };
  }

  const origen = input.origen ?? traido;
  if (!origen) throw prohibido("Falta origen JSON para simular, aplicar o conciliar.");
  const datos = validarDatos(origen);
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
    modulosActivos: input.soloComercial ? ctx.modulosActivos.filter((m) => m !== "finanzas") : ctx.modulosActivos,
    ...(tenant?.slug ? { tenantSlug: tenant.slug } : {}),
  });

  if (input.accion === "conciliar") {
    return {
      dryRun: true,
      accion: "conciliar" as const,
      conciliacion: conciliar(datos, plan),
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
      plan,
      aplicadas: null,
      conciliacion: null,
      revertir: null,
      usuariosResueltos: resueltos,
      usuariosSinMembresia: sinMembresia,
    };
  }

  try {
    await exigirImportacionAbierta(ctx.tenantId, input.permitirReimportacion);
  } catch (e) {
    if (e instanceof ImportacionCerradaError) {
      throw prohibido("Importación cerrada en este tenant. Use permitirReimportacion si corresponde.");
    }
    throw e;
  }

  const importacionId = await iniciarCorrida(ctx.tenantId, {
    modo: "aplicar",
    origen: "instantanea",
    lanzadaPorId: ctx.usuario?.id ?? null,
  });
  const r = await aplicarPorLotes(ctx.tenantId, importacionId, plan);
  await cerrarCorrida(ctx.tenantId, importacionId, "completada", {
    aplicadas: r.aplicadas,
    omitidas: r.omitidas,
  });
  plan = { ...plan, importacionId };

  return {
    dryRun: false,
    accion: "aplicar" as const,
    reporte: construirReporte(plan, ctx.tenantId),
    plan,
    conciliacion: null,
    revertir: null,
    aplicadas: {
      cuentas: r.aplicadas.cuentas,
      contactos: r.aplicadas.contactos,
      instalaciones: r.aplicadas.instalaciones,
      programaciones: r.aplicadas.programaciones,
      omitidas: r.omitidas,
      importacionId,
    },
    usuariosResueltos: resueltos,
    usuariosSinMembresia: sinMembresia,
  };
}

export { inputImportar10, pideOpai1 } from "./importar-1-0-entrada";
