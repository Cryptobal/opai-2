import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { codigoLote, sinRendicionPropia, totalLote, validarSeleccionReversa } from "../domain";
import { resumenSchema, uuidSchema, sinDuplicado } from "./esquemas";
import { loteSalidaSchema } from "./lotes-esquemas";
import { loteConSolicitantes, pasoPermitido } from "./lotes-flujo";
import { anotarPasoLote, cuentasDeSolicitantes, siguienteCodigoLote } from "./lotes-util";
import { PERMISO_PAGAR } from "./permisos";
import { anotarPaso } from "./registro";
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
        lotes: { some: { activo: true, lote: { estado: "pagado", esReversa: false } } },
      },
      orderBy: { codigo: "asc" },
      take: input.limite,
    });
    const abiertas = await ctx.db.lotePagoItem.findMany({
      where: { activo: false, lote: { esReversa: true, estado: { in: ["borrador", "aprobado"] } } },
      select: { rendicionId: true },
    });
    const enReversa = new Set(abiertas.map((x) => x.rendicionId));
    const nombres = await nombresDe(ctx, filas.map((f) => f.solicitanteId));
    return {
      rendiciones: filas.filter((f) => !enReversa.has(f.id)).map((f) => ({
        ...resumenDe(f, nombres),
        solicitanteNombre: nombres.get(f.solicitanteId) ?? null,
      })),
    };
  },
});

async function datosParaReversa(ctx: Contexto, ids: string[]) {
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
    if (problemas.length > 0) throw reglaDeNegocio(problemas.join(" "));
    if (!sinRendicionPropia(yo, datos.map((r) => r.solicitanteId))) throw prohibido("Nadie arma un lote de reversa con una rendición propia.");
    const total = totalLote(datos);
    if (dryRun) return { id: "00000000-0000-0000-0000-000000000000", estado: "borrador" as const, totalClp: total, cantidad: datos.length };
    const cuentas = await cuentasDeSolicitantes(ctx, datos.map((r) => r.solicitanteId));
    const lote = await sinDuplicado(
      ctx.transaccion(async (tx) => {
        const codigo = await siguienteCodigoLote(tx, ctx.tenantId);
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
      }),
      "Una de las rendiciones ya está en otro lote de reversa abierto.",
    );
    return { id: lote.id, estado: "borrador" as const, totalClp: lote.totalClp, cantidad: lote.cantidad };
  },
});

export const lotesAplicarReversa = defineCapability({
  id: "rendiciones.lotes.aplicar_reversa",
  descripcion:
    "Aplica un lote de reversa aprobado: las rendiciones pasan de Pagada a Aprobada y quedan libres para pagarse de nuevo. Es irreversible; un agente necesita la aprobación de una persona.",
  permiso: PERMISO_PAGAR,
  portales: ["erp"],
  exigeAprobacion: () => true,
  input: z.object({
    id: uuidSchema,
    motivo: z.string().trim().min(3).max(300).describe("Motivo del administrador al revertir el pago."),
  }),
  output: loteSalidaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const yo = actorId(ctx);
    const { lote, solicitantes } = await loteConSolicitantes(ctx, input.id);
    if (!lote.esReversa) throw reglaDeNegocio("Solo aplica a un lote de reversa.");
    pasoPermitido(lote.estado, "aplicado", true);
    if (!sinRendicionPropia(yo, solicitantes)) throw prohibido("Nadie aplica un lote de reversa con una rendición propia.");
    const salida = { id: lote.id, estado: "aplicado" as const, totalClp: lote.totalClp, cantidad: lote.cantidad };
    if (dryRun) return salida;
    const ids = lote.items.map((i) => i.rendicionId);
    await ctx.transaccion(async (tx) => {
      const n = await tx.lotePago.updateMany({
        where: { id: lote.id, estado: "aprobado", esReversa: true },
        data: { estado: "aplicado", aplicadoPorId: yo, aplicadoEn: new Date(), motivoReversa: input.motivo },
      });
      if (n.count !== 1) throw conflicto("El lote cambió de estado mientras tanto.");
      const libera = await tx.lotePagoItem.updateMany({ where: { rendicionId: { in: ids }, activo: true }, data: { activo: false } });
      if (libera.count !== ids.length) throw conflicto("Una rendición ya no está ligada al lote pagado.");
      const p = await tx.rendicion.updateMany({ where: { id: { in: ids }, estado: "pagada" }, data: { estado: "aprobada" } });
      if (p.count !== ids.length) throw conflicto("Una rendición del lote ya no está pagada.");
      const rends = await tx.rendicion.findMany({
        where: { id: { in: ids } },
        select: { id: true, tenantId: true, codigo: true, solicitanteId: true, montoTotal: true },
      });
      for (const x of rends) {
        await anotarPaso(
          ctx,
          tx,
          x,
          { tipo: "reversa_pago", actorId: yo, desde: "pagada", hasta: "aprobada", comentario: `${codigoLote(lote.codigo)} · ${input.motivo}` },
          { loteId: lote.id, montoTotal: x.montoTotal, solicitanteId: x.solicitanteId },
        );
      }
      await anotarPasoLote(ctx, tx, lote, { tipo: "aplicado", actorId: yo, desde: "aprobado", hasta: "aplicado", comentario: input.motivo });
    });
    return salida;
  },
});