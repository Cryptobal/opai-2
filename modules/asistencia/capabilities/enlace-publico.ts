import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";
import { hmacDispositivo, normalizarCodigoMarcacionPublica, nuevoCodigoMarcacionPublica } from "@opai/db";
import type { Contexto } from "@opai/capabilities";

import { uuid } from "./esquemas";

async function instalacionVisible(ctx: Contexto, instalacionId: string) {
  const i = await ctx.db.instalacion.findFirst({ where: { id: instalacionId }, select: { id: true } });
  if (!i) throw noEncontrado("La instalación");
}

const codigoSchema = z.object({
  aplicado: z.boolean(),
  codigo: z.string().nullable(),
  url: z.string().nullable(),
});

const enlacePublicoRotar = defineCapability({
  id: "asistencia.marcas.enlace_publico_rotar",
  descripcion:
    "Genera o rota el código de enlace público para marcar asistencia en una instalación (RUT y PIN, sin equipo emparejado). El código anterior deja de servir de inmediato; se muestra una sola vez con la URL para el QR.",
  permiso: "asistencia:configurar",
  input: z.object({ instalacionId: uuid }),
  output: codigoSchema,
  efecto: "escritura",
  dryRun: true,
  salidaIdempotente: (s) => ({ ...s, codigo: null, url: null }),
  auditoriaPayload: (_ctx, e) => ({ instalacionId: e.instalacionId }),
  async handler(ctx, { instalacionId }, { dryRun }) {
    await instalacionVisible(ctx, instalacionId);
    if (dryRun) return { aplicado: false, codigo: null, url: null };
    const codigo = await ctx.transaccion(async (tx) => {
      await tx.codigoMarcacionPublica.deleteMany({ where: { instalacionId } });
      let c = nuevoCodigoMarcacionPublica();
      for (let i = 0; i < 5; i += 1) {
        try {
          await tx.codigoMarcacionPublica.create({
            data: {
              tenantId: ctx.tenantId,
              instalacionId,
              codigoHash: hmacDispositivo(c),
              creadoPor: ctx.actor.tipo === "user" ? ctx.actor.id : null,
            },
          });
          return c;
        } catch {
          c = nuevoCodigoMarcacionPublica();
        }
      }
      throw new Error("No se pudo generar el código");
    });
    return { aplicado: true, codigo, url: `${ctx.servicios.urlBase}/marcar/${codigo}` };
  },
});

const enlacePublicoEstado = defineCapability({
  id: "asistencia.marcas.enlace_publico_estado",
  descripcion: "Indica si una instalación tiene un enlace público de marcación activo (sin revelar el código).",
  permiso: "asistencia:ver",
  input: z.object({ instalacionId: uuid }),
  output: z.object({ activo: z.boolean(), rotadoEn: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { instalacionId }) {
    await instalacionVisible(ctx, instalacionId);
    const fila = await ctx.db.codigoMarcacionPublica.findFirst({
      where: { instalacionId },
      select: { updatedAt: true },
    });
    return { activo: !!fila, rotadoEn: fila?.updatedAt.toISOString() ?? null };
  },
});

const codigoEntrada = z.string().min(4).max(16);

export const enlacePublicoResolver = defineCapability({
  id: "asistencia.marcas.enlace_publico_resolver",
  descripcion:
    "Resuelve el enlace público de marcación para mostrar la instalación antes de identificarse. No revela datos personales.",
  permiso: null,
  interna: true,
  input: z.object({ codigo: codigoEntrada }),
  output: z.object({ instalacionNombre: z.string(), empresaNombre: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { codigo }) {
    const norm = normalizarCodigoMarcacionPublica(codigo);
    if (!norm) throw noEncontrado("El enlace");
    const fila = await ctx.db.codigoMarcacionPublica.findFirst({
      where: { tenantId: ctx.tenantId, codigoHash: hmacDispositivo(norm) },
      select: { instalacionId: true },
    });
    if (!fila) throw noEncontrado("El enlace");
    const instalacion = await ctx.db.instalacion.findUnique({
      where: { id: fila.instalacionId },
      select: { nombre: true, cuenta: { select: { nombre: true, razonSocial: true } } },
    });
    if (!instalacion) throw noEncontrado("El enlace");
    const empresa = instalacion.cuenta.razonSocial || instalacion.cuenta.nombre;
    return { instalacionNombre: instalacion.nombre, empresaNombre: empresa };
  },
});

export const capacidadesEnlacePublico = [enlacePublicoRotar, enlacePublicoEstado, enlacePublicoResolver];