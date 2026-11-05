import { z } from "zod";

import {
  conflicto,
  defineCapability,
  noEncontrado,
  prohibido,
  reglaDeNegocio,
} from "@opai/capabilities";

import { anioEnZona, formatearCodigo, validaHastaPorDefecto, type EstadoCotizacion } from "../domain";
import { sePuedeCrearVersionNueva } from "../domain/estado-ficha";
import { copiarSeccionesYLineas, datosVersionDesde } from "../persistencia/version-copiar";
import { versionParaFicha } from "../persistencia/version";
import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe, ID_VISTA_PREVIA } from "./util";

export const cotizacionesClonar = defineCapability({
  id: "cpq.cotizaciones.clonar",
  descripcion:
    "Duplica una cotización en borrador (nuevo código CPQ) copiando secciones y líneas de la versión de referencia (editable o la última enviada).",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    titulo: z.string().trim().min(3).max(160).optional(),
  }),
  output: z.object({ id: uuidSchema, codigo: z.string(), versionId: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Se necesita una sesión de usuario para clonar.");
    const origen = await cotizacionDe(ctx, input.id);
    const versionOrigen = await versionParaFicha(ctx, origen.id);
    if (!versionOrigen) throw noEncontrado("La versión");
    const negocio = await ctx.db.negocio.findFirst({ where: { id: origen.negocioId } });
    if (!negocio || negocio.estado !== "abierto" || negocio.archivadoEn)
      throw reglaDeNegocio("El negocio debe estar abierto.");
    const ahora = new Date();
    const anio = anioEnZona(ahora);
    if (dryRun) {
      const c = await ctx.db.cpqCorrelativo.findFirst({ where: { anio } });
      return {
        id: ID_VISTA_PREVIA,
        codigo: formatearCodigo(anio, (c?.ultimo ?? 0) + 1),
        versionId: ID_VISTA_PREVIA,
      };
    }
    try {
      return await ctx.transaccion(async (tx) => {
        const corr = await tx.cpqCorrelativo.upsert({
          where: { tenantId_anio: { tenantId: ctx.tenantId, anio } },
          create: { tenantId: ctx.tenantId, anio, ultimo: 1 },
          update: { ultimo: { increment: 1 } },
        });
        const codigo = formatearCodigo(anio, corr.ultimo);
        const c = await tx.cpqCotizacion.create({
          data: {
            tenantId: ctx.tenantId,
            codigo,
            negocioId: origen.negocioId,
            titulo: input.titulo ?? `${origen.titulo} (copia)`,
            alternativaDeId: origen.alternativaDeId,
            vigente: false,
            creadoPorId: ctx.usuario!.id,
          },
        });
        const v = await tx.cpqVersion.create({
          data: datosVersionDesde(versionOrigen, c.id, 1, ctx.usuario!.id),
        });
        await copiarSeccionesYLineas(tx, ctx.tenantId, versionOrigen.id, v.id);
        await ctx.eventos.emitir(tx, {
          tipo: "cpq.cotizacion.creada",
          entidadTipo: "cotizacion",
          entidadId: c.id,
          payload: { codigo, negocioId: origen.negocioId, vigente: false, clonadaDe: origen.id },
        });
        return { id: c.id, codigo, versionId: v.id };
      });
    } catch (e) {
      if ((e as { code?: unknown } | null)?.code === "P2002")
        throw conflicto("Conflicto al clonar la cotización.");
      throw e;
    }
  },
});

export const versionesCrear = defineCapability({
  id: "cpq.versiones.crear",
  descripcion:
    "Crea la versión siguiente en borrador copiando secciones y líneas si la última ya está congelada.",
  permiso: PERMISO_MANAGE,
  input: z.object({ cotizacionId: uuidSchema }),
  output: z.object({ versionId: uuidSchema, numero: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.usuario) throw prohibido("Se necesita una sesión de usuario.");
    await cotizacionDe(ctx, input.cotizacionId);
    const versiones = await ctx.db.cpqVersion.findMany({
      where: { cotizacionId: input.cotizacionId },
      orderBy: [{ numero: "desc" }],
    });
    const ultima = versiones[0];
    if (!ultima) throw noEncontrado("La versión");
    if (ultima.estado === "borrador")
      throw reglaDeNegocio("Ya hay una versión en borrador: edítala o envíala antes de crear otra.");
    if (!sePuedeCrearVersionNueva(ultima.estado as EstadoCotizacion))
      throw reglaDeNegocio(
        ultima.estado === "lista"
          ? "La cotización está lista: usa «Reabrir para editar» o envíala; no hace falta una versión nueva."
          : "La versión actual todavía no salió: espera la decisión o retira el pedido antes de crear otra.",
        { codigo: "version_editable_existente" },
      );
    const numero = ultima.numero + 1;
    if (dryRun) return { versionId: ID_VISTA_PREVIA, numero };
    const validaHasta = validaHastaPorDefecto(new Date());
    return await ctx.transaccion(async (tx) => {
      const v = await tx.cpqVersion.create({
        data: {
          ...datosVersionDesde(ultima, input.cotizacionId, numero, ctx.usuario!.id),
          validaHasta: new Date(`${validaHasta}T00:00:00Z`),
        },
      });
      await copiarSeccionesYLineas(tx, ctx.tenantId, ultima.id, v.id);
      return { versionId: v.id, numero };
    });
  },
});
