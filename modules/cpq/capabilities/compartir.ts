import { randomBytes } from "node:crypto";

import { z } from "zod";

import { type Contexto, defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { enlacePublicoPermitido, hashDeToken } from "../persistencia/enlace-publico";
import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";

const DIA_MS = 86_400_000;

export const enlaceSchema = z.object({
  id: uuidSchema,
  /** Solo al crear: el token no se guarda en claro y no se puede volver a leer. */
  url: z.string(),
  venceEn: z.date(),
  vistas: z.number().int(),
  ultimaVistaEn: z.date().nullable(),
});

/** URL pública `/p/<slug>/<token>`: el tenant sale del slug (como la firma por enlace). */
export async function urlDeEnlace(ctx: Contexto, token: string) {
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  return `${ctx.servicios.urlBase}/p/${t?.slug ?? ""}/${token}`;
}

/**
 * Compartir (CPQ v4): enlace público de la última versión enviada o aceptada, con vencimiento y
 * revocable. Crear uno nuevo revoca el anterior (un solo enlace activo). WhatsApp y correo los abre
 * la pantalla con este enlace: el sistema no envía mensajes por API.
 */
export const compartirCrear = defineCapability({
  id: "cpq.compartir.crear",
  descripcion:
    "Crea el enlace público de una cotización enviada o aceptada, con vencimiento en días, para compartirlo por WhatsApp o correo; revoca el enlace anterior. El cliente solo ve precios y alcance, nunca costos ni margen.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    cotizacionId: uuidSchema,
    diasVigencia: z.number().int().min(1).max(90).default(15),
  }),
  output: enlaceSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!(await enlacePublicoPermitido(ctx)))
      throw reglaDeNegocio(
        "El enlace público no está disponible: la empresa comparte las cotizaciones por el Portal Cliente (o el enlace está apagado en Ajustes de CPQ).",
      );
    const c = await cotizacionDe(ctx, input.cotizacionId);
    if (c.archivadaEn) throw reglaDeNegocio("La cotización está archivada: restáurala para compartirla.");
    const version = await ctx.db.cpqVersion.findFirst({
      where: { cotizacionId: c.id, estado: { in: ["enviada", "aceptada"] } },
      orderBy: { numero: "desc" },
      select: { id: true },
    });
    if (!version) throw reglaDeNegocio("Envía la cotización antes de compartirla por enlace.");
    const venceEn = new Date(Date.now() + input.diasVigencia * DIA_MS);
    if (dryRun)
      return {
        id: "00000000-0000-0000-0000-000000000000",
        url: await urlDeEnlace(ctx, "0".repeat(32)),
        venceEn,
        vistas: 0,
        ultimaVistaEn: null,
      };
    const token = randomBytes(16).toString("hex");
    const fila = await ctx.transaccion(async (tx) => {
      await tx.cpqEnlaceCompartido.updateMany({
        where: { cotizacionId: c.id, revocadoEn: null },
        data: { revocadoEn: new Date() },
      });
      return tx.cpqEnlaceCompartido.create({
        data: {
          tenantId: ctx.tenantId,
          cotizacionId: c.id,
          versionId: version.id,
          tokenHash: hashDeToken(token),
          venceEn,
          creadoPorId: ctx.usuario!.id,
        },
      });
    });
    return {
      id: fila.id,
      url: await urlDeEnlace(ctx, token),
      venceEn: fila.venceEn,
      vistas: 0,
      ultimaVistaEn: null,
    };
  },
});

export const compartirRevocar = defineCapability({
  id: "cpq.compartir.revocar",
  descripcion:
    "Revoca el enlace público activo de una cotización: deja de abrirse de inmediato. Se puede crear otro después.",
  permiso: PERMISO_MANAGE,
  input: z.object({ cotizacionId: uuidSchema }),
  output: z.object({ revocados: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cotizacionDe(ctx, input.cotizacionId);
    const donde = { cotizacionId: c.id, revocadoEn: null };
    if (dryRun) return { revocados: await ctx.db.cpqEnlaceCompartido.count({ where: donde }) };
    const r = await ctx.transaccion((tx) =>
      tx.cpqEnlaceCompartido.updateMany({ where: donde, data: { revocadoEn: new Date() } }),
    );
    return { revocados: r.count };
  },
});
