import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { puedeDecidir, puedeTransitar, type EstadoRendicion } from "../domain";
import { estadoSchema, uuidSchema } from "./esquemas";
import { PERMISO_APROBAR } from "./permisos";
import { anotarPaso } from "./registro";
import { actorId, rendicionDe } from "./util";

const salidaSchema = z.object({ id: uuidSchema, estado: estadoSchema });
const motivoSchema = z.string().trim().min(3).max(500);

type Decision = { tipo: "aprobada" | "rechazada" | "devuelta"; efecto: "escritura" | "irreversible"; verbo: string; descripcion: string; motivo: boolean };

function decidir(d: Decision) {
  return defineCapability({
    id: `rendiciones.rendiciones.${d.verbo}`,
    descripcion: d.descripcion,
    permiso: PERMISO_APROBAR,
    input: d.motivo ? z.object({ id: uuidSchema, motivo: motivoSchema }) : z.object({ id: uuidSchema, comentario: motivoSchema.optional() }),
    output: salidaSchema,
    efecto: d.efecto,
    dryRun: true,
    async handler(ctx, input, { dryRun }) {
      const yo = actorId(ctx);
      const r = await rendicionDe(ctx, input.id);
      if (r.solicitanteId === yo) throw prohibido("Nadie decide su propia rendición.");
      if (!puedeDecidir(r.solicitanteId, yo, r.aprobadorId)) throw prohibido("Esta rendición la decide otro aprobador.");
      if (!puedeTransitar(r.estado as EstadoRendicion, d.tipo)) throw reglaDeNegocio(`Una rendición «${r.estado}» no se puede ${d.verbo === "aprobar" ? "aprobar" : d.verbo === "rechazar" ? "rechazar" : "devolver"}.`);
      if (dryRun) return { id: r.id, estado: d.tipo };
      const texto = "motivo" in input ? input.motivo : input.comentario;
      await ctx.transaccion(async (tx) => {
        const n = await tx.rendicion.updateMany({
          where: { id: r.id, estado: "enviada", aprobadorId: yo },
          data: { estado: d.tipo, decididaEn: new Date(), decididaPorId: yo, motivoDecision: d.motivo ? (texto ?? null) : null },
        });
        if (n.count !== 1) throw conflicto("La rendición cambió de estado mientras tanto.");
        await anotarPaso(ctx, tx, r, { tipo: d.tipo, actorId: yo, desde: "enviada", hasta: d.tipo, comentario: texto }, { solicitanteId: r.solicitanteId, montoTotal: r.montoTotal });
      });
      return { id: r.id, estado: d.tipo };
    },
  });
}

export const rendicionesAprobar = decidir({
  tipo: "aprobada", efecto: "irreversible", verbo: "aprobar", motivo: false,
  descripcion: "Aprueba una rendición enviada que tiene asignada. Solo el aprobador asignado y nunca quien rinde; es una decisión que da pie al pago, por eso un agente necesita la aprobación de una persona.",
});
export const rendicionesRechazar = decidir({
  tipo: "rechazada", efecto: "irreversible", verbo: "rechazar", motivo: true,
  descripcion: "Rechaza de forma definitiva una rendición enviada que tiene asignada, con el motivo. Quien rinde debe crear una nueva; para pedir correcciones se usa «devolver».",
});
export const rendicionesDevolver = decidir({
  tipo: "devuelta", efecto: "escritura", verbo: "devolver", motivo: true,
  descripcion: "Devuelve a quien rinde una rendición enviada, con el motivo, para que la corrija y la vuelva a enviar. No es un rechazo: el código y el historial se conservan.",
});
