import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { enlacePublicoPermitido, hashDeToken } from "../persistencia/enlace-publico";

const lineaPublica = z.object({ nombre: z.string(), posiciones: z.number().int() });

/**
 * Vista pública de una cotización compartida (`/p/<slug>/<token>`). Interna: la resuelve solo la
 * página pública con el tenant del slug y el enlace como credencial; no se expone por MCP ni API.
 * Devuelve lo que ve el cliente (alcance y venta mensual), nunca costos, sueldos ni margen (R59).
 * Revocado, vencido o inexistente dan el mismo NOT_FOUND (sin enumeración). Cuenta la vista.
 */
export const compartirVer = defineCapability({
  id: "cpq.compartir.ver",
  descripcion:
    "Muestra al cliente la cotización compartida por enlace: alcance por instalación y venta mensual, sin costos ni margen; cuenta la vista.",
  permiso: null,
  interna: true,
  input: z.object({ token: z.string().regex(/^[0-9a-f]{32}$/) }),
  sensibles: ["token"],
  output: z.object({
    empresa: z.string(),
    codigo: z.string(),
    titulo: z.string(),
    moneda: z.string(),
    ventaMensualClp: z.number().int().nullable(),
    validaHasta: z.string().nullable(),
    venceEn: z.date(),
    secciones: z.array(z.object({ nombre: z.string(), lineas: z.array(lineaPublica) })),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // Apagado por ajuste o con Portal Cliente: mismo NOT_FOUND que un enlace inexistente.
    if (!(await enlacePublicoPermitido(ctx))) throw noEncontrado("El enlace");
    const e = await ctx.db.cpqEnlaceCompartido.findFirst({
      where: { tokenHash: hashDeToken(input.token), revocadoEn: null, venceEn: { gt: new Date() } },
      include: { cotizacion: true },
    });
    if (!e || e.cotizacion.archivadaEn) throw noEncontrado("El enlace");
    const [v, secciones, tenant, perfil] = await Promise.all([
      ctx.db.cpqVersion.findUniqueOrThrow({ where: { id: e.versionId } }),
      ctx.db.cpqSeccion.findMany({
        where: { versionId: e.versionId },
        orderBy: [{ orden: "asc" }, { id: "asc" }],
        include: {
          lineas: {
            where: { habilitada: true, visibleCliente: true },
            orderBy: [{ orden: "asc" }, { id: "asc" }],
            select: { nombre: true, posiciones: true, tipo: true },
          },
        },
      }),
      ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
      ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
    ]);
    if (!dryRun) {
      await ctx.transaccion((tx) =>
        tx.cpqEnlaceCompartido.update({
          where: { id: e.id },
          data: { vistas: { increment: 1 }, ultimaVistaEn: new Date() },
        }),
      );
    }
    return {
      empresa: perfil?.nombreComercial ?? tenant?.nombre ?? "OPAI",
      codigo: e.cotizacion.codigo,
      titulo: e.cotizacion.titulo,
      moneda: v.moneda,
      ventaMensualClp: v.ventaMensualClp,
      validaHasta: v.validaHasta ? v.validaHasta.toISOString().slice(0, 10) : null,
      venceEn: e.venceEn,
      secciones: secciones
        .filter((s) => s.lineas.length)
        .map((s) => ({
          nombre: s.nombre,
          lineas: s.lineas.map((l) => ({ nombre: l.nombre, posiciones: l.tipo === "puesto" ? l.posiciones : 1 })),
        })),
    };
  },
});
