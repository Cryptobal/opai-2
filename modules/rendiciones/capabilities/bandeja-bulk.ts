import { z } from "zod";

import { conflicto, defineCapability, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { codigoVisible, puedeDecidir, puedeTransitar, type EstadoRendicion } from "../domain";
import { estadoSchema, uuidSchema } from "./esquemas";
import { PERMISO_APROBAR } from "./permisos";
import { anotarPaso } from "./registro";
import { actorId } from "./util";

const idsSchema = z.array(uuidSchema).min(1).max(50);
const filaOk = z.object({ id: uuidSchema, codigoVisible: z.string(), estado: estadoSchema });
const filaOm = z.object({ id: uuidSchema, motivo: z.string() });
const salidaSchema = z.object({ aplicadas: z.array(filaOk), omitidas: z.array(filaOm) });

type Tipo = "aprobada" | "rechazada";

async function intentarUna(
  ctx: Contexto,
  id: string,
  tipo: Tipo,
  motivo: string | null,
  dryRun: boolean,
): Promise<{ ok: { id: string; codigoVisible: string; estado: z.infer<typeof estadoSchema> } } | { omitida: { id: string; motivo: string } }> {
  const yo = actorId(ctx);
  const r = await ctx.db.rendicion.findFirst({
    where: { id },
    select: { id: true, codigo: true, estado: true, solicitanteId: true, aprobadorId: true, montoTotal: true, tenantId: true },
  });
  if (!r) return { omitida: { id, motivo: "No existe en esta empresa." } };
  if (r.solicitanteId === yo) return { omitida: { id, motivo: "Nadie decide su propia rendición." } };
  if (!puedeDecidir(r.solicitanteId, yo, r.aprobadorId))
    return { omitida: { id, motivo: "La decide otro aprobador." } };
  if (!puedeTransitar(r.estado as EstadoRendicion, tipo))
    return { omitida: { id, motivo: `Estado «${r.estado}»: no se puede ${tipo === "aprobada" ? "aprobar" : "rechazar"}.` } };
  const codVis = codigoVisible(r.codigo);
  if (dryRun) return { ok: { id: r.id, codigoVisible: codVis, estado: tipo } };
  try {
    await ctx.transaccion(async (tx) => {
      const n = await tx.rendicion.updateMany({
        where: { id: r.id, estado: "enviada", aprobadorId: yo },
        data: { estado: tipo, decididaEn: new Date(), decididaPorId: yo, motivoDecision: tipo === "rechazada" ? motivo : null },
      });
      if (n.count !== 1) throw conflicto("Cambió de estado mientras tanto.");
      await anotarPaso(
        ctx,
        tx,
        r,
        { tipo, actorId: yo, desde: "enviada", hasta: tipo, comentario: motivo ?? undefined },
        { solicitanteId: r.solicitanteId, montoTotal: r.montoTotal },
      );
    });
    return { ok: { id: r.id, codigoVisible: codVis, estado: tipo } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo aplicar.";
    return { omitida: { id, motivo: msg } };
  }
}

function bulk(tipo: Tipo, idCap: string, descripcion: string) {
  const conMotivo = tipo === "rechazada";
  return defineCapability({
    id: idCap,
    descripcion,
    permiso: PERMISO_APROBAR,
    input: conMotivo
      ? z.object({ ids: idsSchema, motivo: z.string().trim().min(3).max(500) })
      : z.object({ ids: idsSchema }),
    output: salidaSchema,
    efecto: tipo === "aprobada" ? "irreversible" : "irreversible",
    dryRun: true,
    async handler(ctx, input, { dryRun }) {
      const motivo = conMotivo && "motivo" in input && typeof input.motivo === "string" ? input.motivo : null;
      const aplicadas: z.infer<typeof filaOk>[] = [];
      const omitidas: z.infer<typeof filaOm>[] = [];
      for (const id of input.ids) {
        const r = await intentarUna(ctx, id, tipo, motivo, dryRun);
        if ("ok" in r) aplicadas.push(r.ok);
        else omitidas.push(r.omitida);
      }
      if (!dryRun && aplicadas.length === 0 && omitidas.length > 0)
        throw reglaDeNegocio("Ninguna rendición quedó lista. Revisa los motivos en la vista previa.");
      return { aplicadas, omitidas };
    },
  });
}

export const bandejaAprobarVarias = bulk(
  "aprobada",
  "rendiciones.bandeja.aprobar_varias",
  "Aprueba hasta 50 rendiciones enviadas que tienes asignadas. Devuelve las omitidas con motivo. Usa dryRun para previsualizar.",
);

export const bandejaRechazarVarias = bulk(
  "rechazada",
  "rendiciones.bandeja.rechazar_varias",
  "Rechaza hasta 50 rendiciones enviadas con el mismo motivo. Usa dryRun para previsualizar.",
);