import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  calcularEstadoCobro,
  defineCapability,
  reglaDeNegocio,
  sincronizarCobroDocumento,
  validarDocumentoCobroBanco,
} from "@opai/capabilities";
import type { Prisma } from "@opai/db";

import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { aIso } from "./util";

/** Registra un pago manual como movimiento + conciliación deshacible (paridad 1.0 «sin conciliar»). */
export const bancosCobroManual = defineCapability({
  id: "finanzas.cobros.manual",
  descripcion:
    "Registra un cobro manual sobre una factura emitida creando movimiento bancario y conciliación activa.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({
    documentoId: z.uuid(),
    monto: z.number().int().positive(),
    nota: z.string().max(300).optional(),
    cuentaId: z.uuid().optional(),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  output: z.object({
    movimientoId: z.string(),
    estadoCobro: z.string(),
    montoCobrado: z.number().int(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw reglaDeNegocio("El documento no existe.");
    validarDocumentoCobroBanco(doc, input.monto);

    const agg = await ctx.db.conciliacionBanco.aggregate({
      where: {
        enlaceId: input.documentoId,
        tipoEnlace: "documento_emitido",
        activa: true,
        confirmada: true,
      },
      _sum: { monto: true },
    });
    const previo = Number(agg._sum.monto ?? 0n);
    const montoCobrado = Math.min(doc.montoTotal, previo + input.monto);
    const estadoCobro = calcularEstadoCobro(doc.montoTotal, montoCobrado);

    if (dryRun) {
      return { movimientoId: "", estadoCobro, montoCobrado };
    }

    const cuenta = input.cuentaId
      ? await ctx.db.cuentaBancaria.findFirst({ where: { id: input.cuentaId } })
      : await ctx.db.cuentaBancaria.findFirst({ where: { activa: true }, orderBy: { createdAt: "asc" } });
    if (!cuenta) throw reglaDeNegocio("No hay cuenta bancaria activa para registrar el cobro.");

    const fechaIso = input.fecha ?? aIso(new Date());
    const glosa = input.nota?.trim() ? `Cobro manual: ${input.nota.trim()}` : "Cobro manual";
    let movimientoId = "";
    let out = { estadoCobro, montoCobrado };

    await ctx.transaccion(async (tx) => {
      const actual = await tx.documentoEmitido.findFirst({ where: { id: input.documentoId } });
      if (!actual) throw reglaDeNegocio("El documento no existe.");
      validarDocumentoCobroBanco(actual, input.monto);

      const mov = await tx.movimientoBancario.create({
        data: {
          tenantId: ctx.tenantId,
          cuentaId: cuenta.id,
          fecha: new Date(`${fechaIso}T00:00:00Z`),
          monto: BigInt(input.monto),
          glosa,
          claveDedupe: `manual-${randomUUID()}`,
          estado: "conciliado",
          origen: "manual",
        },
      });
      movimientoId = mov.id;

      await tx.conciliacionBanco.create({
        data: {
          tenantId: ctx.tenantId,
          movimientoId: mov.id,
          tipoEnlace: "documento_emitido",
          enlaceId: input.documentoId,
          monto: BigInt(input.monto),
          activa: true,
          propuesta: false,
          confirmada: true,
          ...(input.nota ? { explicacion: { nota: input.nota } satisfies Prisma.InputJsonValue } : {}),
          createdById: ctx.usuario?.id ?? null,
        },
      });

      out = await sincronizarCobroDocumento(tx, input.documentoId);

      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.cobro_manual",
        entidadTipo: "movimientoBancario",
        entidadId: mov.id,
        payload: { documentoId: input.documentoId },
      });
    });

    return { movimientoId, estadoCobro: out.estadoCobro, montoCobrado: out.montoCobrado };
  },
});
