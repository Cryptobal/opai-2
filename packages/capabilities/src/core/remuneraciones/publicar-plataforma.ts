import { agregarAAuditoria, lockCapturaSiiGlobal, remuneracionesPublicarSii, unlockCapturaSiiGlobal } from "@opai/db";

import type { Contexto } from "../../types";

import { fuenteEsSii, valorEnRango, variacionPermitida } from "./sii-validacion";
import type { ClaveSiiPublicable } from "./sii-validacion";

export type PublicarInput = {
  clave: ClaveSiiPublicable;
  valorJson: number;
  vigenteDesde: string;
  fuente: string;
  consultadaEn: Date;
  valorAnterior: number | null;
};

/** Publica UF/UTM del SII en plataforma vía función SECURITY DEFINER (una transacción). */
export async function publicarValorPlataforma(
  ctx: Contexto,
  input: PublicarInput,
): Promise<{ publicadoId: string; cambio: boolean }> {
  if (!fuenteEsSii(input.fuente)) {
    throw new Error("Fuente SII inválida");
  }
  if (!valorEnRango(input.clave, input.valorJson)) {
    throw new Error("Valor fuera de rango");
  }
  if (
    input.valorAnterior != null &&
    !variacionPermitida(input.clave, input.valorJson, input.valorAnterior)
  ) {
    throw new Error("Variación excesiva");
  }

  const publicadoId = await ctx.transaccion(async (tx) => {
    const id = await remuneracionesPublicarSii(tx, {
      clave: input.clave,
      valor: input.valorJson,
      vigenteDesde: input.vigenteDesde,
      fuente: input.fuente,
      consultadaEn: input.consultadaEn,
    });
    await agregarAAuditoria(tx, ctx.tenantId, {
      actorTipo: "system",
      actorId: null,
      viaUserId: null,
      capability: "core.remuneraciones.captura_sii",
      entityType: "valor_publicado",
      entityId: id,
      payload: {
        clave: input.clave,
        vigenteDesde: input.vigenteDesde,
        valor: input.valorJson,
        fuente: input.fuente,
      },
    });
    return id;
  });
  return { publicadoId, cambio: true };
}

export async function intentarLockCapturaGlobal(ctx: Contexto): Promise<boolean> {
  return ctx.transaccion((tx) => lockCapturaSiiGlobal(tx));
}

export async function liberarLockCapturaGlobal(ctx: Contexto): Promise<void> {
  await ctx.transaccion((tx) => unlockCapturaSiiGlobal(tx));
}
