import { z } from "zod";

import { conflicto, defineCapability } from "@opai/capabilities";

import { validarSeleccionReversa } from "../domain";
import { resumenSchema, uuidSchema } from "./esquemas";
import { loteSalidaSchema } from "./lotes-esquemas";
import { anotarPasoLote, crearLoteBorrador, cuentasDeSolicitantes, exigirArmadoLote } from "./lotes-util";
import { PERMISO_PAGAR } from "./permisos";
import { actorId } from "./util";
import { nombresDe, resumenDe } from "./vista";
import type { Contexto } from "@opai/capabilities";

const candidataReversaSchema = resumenSchema.extend({ solicitanteNombre: z.string().nullable() });

export const lotesCandidatasReversa = defineCapability({
  id: "rendiciones.lotes.candidatas_reversa",
  descripcion:
    "Rendiciones pagadas en un lote ya marcado pagado que pueden entrar a un lote de reversa. Al aplicar la reversa vuelven a Aprobada para un nuevo pago.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  input: z.object({ limite: z.number().int().min(1).max(200).default(100) }),
  output: z.object({ rendiciones: z.array(candidataReversaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.rendiciones.map((r) => r.id),
  async handler(ctx, input) {
    actorId(ctx);
    const filas = await ctx.db.rendicion.findMany({
      where: {
        estado: "pagada",
        lotes: {
          some: { activo: true, lote: { estado: "pagado", esReversa: false } },
          none: { activo: false, lote: { esReversa: true, estado: { in: ["borrador", "aprobado"] } } },
        },
      },
      orderBy: { codigo: "asc" },
      take: input.limite,
    });
    const nombres = await nombresDe(ctx, filas.map((f) => f.solicitanteId));
    return {
      rendiciones: filas.map((f) => ({
        ...resumenDe(f, nombres),
        solicitanteNombre: nombres.get(f.solicitanteId) ?? null,
      })),
    };
  },
});

async function datosParaReversa(ctx: Pick<Contexto, "db">, ids: string[]) {
  const rends = await ctx.db.rendicion.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      estado: true,
      montoTotal: true,
      solicitanteId: true,
      lotes: {
        where: { activo: true, lote: { estado: "pagado", esReversa: false } },
        select: { loteId: true, personaId: true, cuentaVersion: true },
      },
    },
  });
  const abiertas = await ctx.db.lotePagoItem.findMany({
    where: { rendicionId: { in: ids }, activo: false, lote: { esReversa: true, estado: { in: ["borrador", "aprobado"] } } },
    select: { rendicionId: true },
  });
  const enReversa = new Set(abiertas.map((x) => x.rendicionId));
  return rends.map((r) => ({
    id: r.id,
    estado: r.estado,
    montoTotal: r.montoTotal,
    solicitanteId: r.solicitanteId,
    lotePagadoId: r.lotes[0]?.loteId ?? null,
    enReversaAbierta: enReversa.has(r.id),
    personaId: r.lotes[0]?.personaId,
    cuentaVersion: r.lotes[0]?.cuentaVersion,
  }));
}

export const lotesCrearReversa = defineCapability({
  id: "rendiciones.lotes.crear_reversa",
  descripcion:
    "Arma un lote de reversa con rendiciones pagadas. Tras aprobarlo, otra persona con permiso de pagos debe aplicar la reversa: las rendiciones vuelven a Aprobada y quedan libres para un nuevo lote.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  input: z.object({ rendicionIds: z.array(uuidSchema).min(1).max(200) }),
  output: loteSalidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const datos = await datosParaReversa(ctx, input.rendicionIds);
    const problemas = validarSeleccionReversa(
      input.rendicionIds,
      datos.map((r) => ({ id: r.id, estado: r.estado, montoTotal: r.montoTotal, solicitanteId: r.solicitanteId, lotePagadoId: r.lotePagadoId, enReversaAbierta: r.enReversaAbierta })),
    );
    const total = exigirArmadoLote(problemas, yo, datos, "Nadie arma un lote de reversa con una rendición propia.");
    const cuentas = dryRun ? new Map() : await cuentasDeSolicitantes(ctx, datos.map((r) => r.solicitanteId));
    return crearLoteBorrador(ctx, dryRun, total, datos.length, "Una de las rendiciones ya está en otro lote de reversa abierto.", async (tx, codigo) => {
      // El contador de lotes ya bloquea por tenant en esta transacción.
      // Releer bajo ese bloqueo evita dos borradores de reversa sobre la misma rendición.
      const vigentes = await datosParaReversa({ db: tx }, input.rendicionIds);
      const vigentesPorId = new Map(vigentes.map((r) => [r.id, r]));
      if (vigentes.length !== datos.length || datos.some((r) => {
        const v = vigentesPorId.get(r.id);
        return !v || v.estado !== "pagada" || v.enReversaAbierta || v.lotePagadoId !== r.lotePagadoId ||
          v.montoTotal !== r.montoTotal || v.solicitanteId !== r.solicitanteId;
      })) throw conflicto("La rendición o su lote pagado cambió antes de crear la reversa.");
      const l = await tx.lotePago.create({
        data: {
          tenantId: ctx.tenantId,
          codigo,
          estado: "borrador",
          esReversa: true,
          totalClp: total,
          cantidad: datos.length,
          creadoPorId: yo,
          items: {
            create: datos.map((r) => {
              const c = cuentas.get(r.solicitanteId);
              return {
                tenantId: ctx.tenantId,
                rendicionId: r.id,
                personaId: c?.personaId ?? r.personaId!,
                montoClp: r.montoTotal,
                cuentaVersion: c?.version ?? r.cuentaVersion!,
                activo: false,
              };
            }),
          },
        },
      });
      await anotarPasoLote(ctx, tx, l, { tipo: "creado_reversa", actorId: yo, hasta: "borrador", comentario: "Lote de reversa" }, { totalClp: total, cantidad: datos.length });
      return l;
    });
  },
});
