import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { puedeTransitar, type EstadoRendicion } from "../domain";
import { estadoSchema, uuidSchema } from "./esquemas";
import { PERMISO_RENDIR, PORTALES_RENDIR } from "./permisos";
import { anotarPaso } from "./registro";
import { actorId, aprobadorEfectivo, rendicionDe, validarAprobador, validarItems } from "./util";

const salidaSchema = z.object({ id: uuidSchema, estado: estadoSchema });

export const rendicionesEnviar = defineCapability({
  id: "rendiciones.rendiciones.enviar",
  descripcion:
    "Envía a aprobación una rendición propia en borrador o devuelta. Revalida los gastos y exige un aprobador (el elegido o el de la empresa); nadie aprueba su propia rendición.",
  permiso: PERMISO_RENDIR,
  portales: PORTALES_RENDIR,
  input: z.object({ id: uuidSchema, aprobadorId: uuidSchema.optional() }),
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const r = await rendicionDe(ctx, input.id);
    if (r.solicitanteId !== yo) throw prohibido("Solo quien rinde envía su rendición.");
    if (!puedeTransitar(r.estado as EstadoRendicion, "enviada"))
      throw reglaDeNegocio(`Una rendición «${r.estado}» no se envía.`);
    const aprobadorId = await aprobadorEfectivo(ctx, input.aprobadorId ?? r.aprobadorId);
    if (!aprobadorId) throw reglaDeNegocio("Elige quién aprueba esta rendición.");
    await validarAprobador(ctx, aprobadorId, yo);
    await validarItems(ctx, r.items.map((i) => ({ fecha: i.fecha.toISOString().slice(0, 10), proveedor: i.proveedor, monto: i.monto, documentoId: i.documentoId ?? undefined, sinRespaldoMotivo: i.sinRespaldoMotivo ?? undefined })));
    if (dryRun) return { id: r.id, estado: "enviada" as const };
    await ctx.transaccion(async (tx) => {
      const n = await tx.rendicion.updateMany({
        where: { id: r.id, estado: r.estado },
        data: { estado: "enviada", aprobadorId, enviadaEn: new Date(), motivoDecision: null },
      });
      if (n.count !== 1) throw conflicto("La rendición cambió de estado mientras tanto.");
      await anotarPaso(
        ctx,
        tx,
        r,
        { tipo: "enviada", actorId: yo, desde: r.estado, hasta: "enviada" },
        { aprobadorId, montoTotal: r.montoTotal },
      );
    });
    return { id: r.id, estado: "enviada" as const };
  },
});

export const rendicionesAnular = defineCapability({
  id: "rendiciones.rendiciones.anular",
  descripcion:
    "Anula una rendición propia que aún no se decide (borrador, devuelta o enviada). Queda en el historial y su código no se reutiliza.",
  permiso: PERMISO_RENDIR,
  portales: PORTALES_RENDIR,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(3).max(300).optional() }),
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const r = await rendicionDe(ctx, input.id);
    if (r.solicitanteId !== yo) throw prohibido("Solo quien rinde anula su rendición.");
    if (!puedeTransitar(r.estado as EstadoRendicion, "anulada"))
      throw reglaDeNegocio(`Una rendición «${r.estado}» no se anula.`);
    if (dryRun) return { id: r.id, estado: "anulada" as const };
    await ctx.transaccion(async (tx) => {
      const n = await tx.rendicion.updateMany({
        where: { id: r.id, estado: r.estado },
        data: { estado: "anulada" },
      });
      if (n.count !== 1) throw conflicto("La rendición cambió de estado mientras tanto.");
      await anotarPaso(ctx, tx, r, {
        tipo: "anulada",
        actorId: yo,
        desde: r.estado,
        hasta: "anulada",
        comentario: input.motivo,
      });
    });
    return { id: r.id, estado: "anulada" as const };
  },
});
