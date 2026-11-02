import { z } from "zod";

import { defineCapability, reglaDeNegocio, registrarCobroDocumento } from "@opai/capabilities";
import type { Prisma } from "@opai/db";

import { PERMISO_BANCOS_GESTIONAR, PERMISO_BANCOS_AUTORIZAR } from "./permisos";
import { montoDe } from "./esquemas";
import { movimientoDe } from "./util";

const enlaceSchema = z.object({
  tipo: z.enum(["documento_emitido", "documento_recibido", "flujo_fila"]),
  id: z.uuid(),
  monto: z.number().int().positive(),
});

export const bancosConciliacionConfirmar = defineCapability({
  id: "finanzas.conciliaciones.confirmar",
  descripcion:
    "Confirma la conciliación de un movimiento con uno o más DTE o una fila del flujo; actualiza cobro en ventas.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({
    movimientoId: z.uuid(),
    enlaces: z.array(enlaceSchema).min(1).max(10),
    explicacion: z.string().max(500).optional(),
  }),
  output: z.object({ conciliado: z.boolean(), estadoCobro: z.string().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const mov = await movimientoDe(ctx, input.movimientoId);
    if (mov.estado === "por_autorizar") {
      const puede = ctx.autorizar(PERMISO_BANCOS_AUTORIZAR);
      if (!puede) throw reglaDeNegocio("El movimiento requiere autorización.");
    }
    const total = input.enlaces.reduce((s, e) => s + e.monto, 0);
    if (Math.abs(total) !== Math.abs(montoDe(mov.monto))) {
      throw reglaDeNegocio("La suma de enlaces debe coincidir con el monto del movimiento.");
    }
    if (dryRun) return { conciliado: true, estadoCobro: null };

    let estadoCobro: string | null = null;
    await ctx.transaccion(async (tx) => {
      for (const e of input.enlaces) {
        await tx.conciliacionBanco.create({
          data: {
            tenantId: ctx.tenantId,
            movimientoId: mov.id,
            tipoEnlace: e.tipo,
            enlaceId: e.id,
            monto: BigInt(e.monto),
            activa: true,
            propuesta: false,
            confirmada: true,
            ...(input.explicacion ? { explicacion: { texto: input.explicacion } satisfies Prisma.InputJsonValue } : {}),
            createdById: ctx.usuario?.id ?? null,
          },
        });
        if (e.tipo === "documento_emitido") {
          const r = await registrarCobroDocumento(tx, { documentoId: e.id, monto: e.monto });
          estadoCobro = r.estadoCobro;
        }
      }
      await tx.movimientoBancario.update({ where: { id: mov.id }, data: { estado: "conciliado" } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.conciliacion_confirmada",
        entidadTipo: "movimientoBancario",
        entidadId: mov.id,
      });
    });
    return { conciliado: true, estadoCobro };
  },
});

export const bancosConciliacionDeshacer = defineCapability({
  id: "finanzas.conciliaciones.deshacer",
  descripcion: "Deshace la conciliación activa de un movimiento bancario y lo deja pendiente o sugerido.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({ movimientoId: z.uuid(), motivo: z.string().trim().min(3).max(500) }),
  output: z.object({ deshecho: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await movimientoDe(ctx, input.movimientoId);
    if (dryRun) return { deshecho: true };
    await ctx.transaccion(async (tx) => {
      await tx.conciliacionBanco.updateMany({
        where: { movimientoId: input.movimientoId, activa: true },
        data: { activa: false },
      });
      await tx.movimientoBancario.update({
        where: { id: input.movimientoId },
        data: { estado: "pendiente" },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.conciliacion_deshecha",
        entidadTipo: "movimientoBancario",
        entidadId: input.movimientoId,
        payload: { motivo: input.motivo },
      });
    });
    return { deshecho: true };
  },
});
