import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { entradasPara, usuarioDe } from "./comun";

const idsSchema = z.array(z.string().min(1).max(80)).min(1).max(50);

async function upsertLectura(
  ctx: Contexto,
  usuarioId: string,
  novedadId: string,
  datos: { leidaEn?: Date; destacadaDescartadaEn?: Date },
) {
  const existente = await ctx.db.novedadLectura.findUnique({
    where: {
      tenantId_usuarioId_novedadId: {
        tenantId: ctx.tenantId,
        usuarioId,
        novedadId,
      },
    },
  });
  if (existente) {
    await ctx.db.novedadLectura.update({
      where: { id: existente.id },
      data: {
        ...(datos.leidaEn ? { leidaEn: datos.leidaEn } : {}),
        ...(datos.destacadaDescartadaEn ? { destacadaDescartadaEn: datos.destacadaDescartadaEn } : {}),
      },
    });
    return;
  }
  await ctx.db.novedadLectura.create({
    data: {
      tenantId: ctx.tenantId,
      usuarioId,
      novedadId,
      leidaEn: datos.leidaEn ?? null,
      destacadaDescartadaEn: datos.destacadaDescartadaEn ?? null,
    },
  });
}

export const novedadesMarcarLeidas = defineCapability({
  id: "core.novedades.marcar_leidas",
  descripcion: "Marca como leídas una o más novedades de producto para el usuario actual.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno", "cliente", "platform"],
  input: z.object({ ids: idsSchema }),
  output: z.object({ marcadas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { ids }, { dryRun }) {
    const usuarioId = usuarioDe(ctx);
    const permitidos = new Set(entradasPara(ctx).map((e) => e.id));
    for (const id of ids) {
      if (!permitidos.has(id)) throw noEncontrado("La novedad");
    }
    if (dryRun) return { marcadas: ids.length };
    const ahora = new Date();
    for (const novedadId of ids) {
      await upsertLectura(ctx, usuarioId, novedadId, { leidaEn: ahora });
    }
    return { marcadas: ids.length };
  },
});

export const novedadesMarcarTodas = defineCapability({
  id: "core.novedades.marcar_todas",
  descripcion: "Marca como leídas todas las novedades visibles para el usuario actual.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno", "cliente", "platform"],
  input: z.object({}),
  output: z.object({ marcadas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _input, { dryRun }) {
    const ids = entradasPara(ctx).map((e) => e.id);
    if (dryRun) return { marcadas: ids.length };
    return novedadesMarcarLeidas.handler(ctx, { ids }, { dryRun: false });
  },
});

export const novedadesDescartarDestacada = defineCapability({
  id: "core.novedades.descartar_destacada",
  descripcion: "Cierra el aviso de la novedad destacada sin marcarla necesariamente como leída.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno", "cliente", "platform"],
  input: z.object({ id: z.string().min(1).max(80) }),
  output: z.object({ id: z.string(), descartadaEn: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const usuarioId = usuarioDe(ctx);
    const entrada = entradasPara(ctx).find((e) => e.id === id && e.destacada);
    if (!entrada) throw noEncontrado("La novedad destacada");
    const descartadaEn = new Date();
    if (!dryRun) {
      await upsertLectura(ctx, usuarioId, id, { destacadaDescartadaEn: descartadaEn });
    }
    return { id, descartadaEn: descartadaEn.toISOString() };
  },
});
