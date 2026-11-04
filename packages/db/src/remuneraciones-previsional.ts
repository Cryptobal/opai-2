import type { TenantTx } from "./transaccion";

export type ClavePrevisional = "imm" | "topes" | "afp" | "sis" | "cesantia";

export type ProponerPrevisionalInput = {
  clave: ClavePrevisional;
  /** Valor completo del indicador, tal como lo guarda `valores_publicados.valor_json`. */
  valor: unknown;
  vigenteDesde: string;
  fuente: string;
  consultada: string;
};

/** El cron propone (o renueva) un valor previsional. Solo `opai_cron_sii` puede ejecutarla (SECURITY DEFINER). */
export async function remuneracionesProponerPrevisional(
  tx: TenantTx,
  input: ProponerPrevisionalInput,
): Promise<"renovado" | "propuesto"> {
  const [fila] = await tx.$queryRaw<{ r: string }[]>`
    SELECT "core"."remuneraciones_proponer_previsional"(
      ${input.clave},
      ${JSON.stringify(input.valor)}::jsonb,
      ${input.vigenteDesde}::date,
      ${input.fuente},
      ${input.consultada}::date
    ) AS r`;
  if (fila?.r !== "renovado" && fila?.r !== "propuesto") {
    throw new Error("remuneraciones_proponer_previsional devolvió un resultado inesperado");
  }
  return fila.r;
}

/** Una persona de plataforma aprueba o rechaza una propuesta (la función verifica `platform_role`). */
export async function remuneracionesResolverPropuesta(
  tx: TenantTx,
  input: { id: string; aprobar: boolean; actorId: string },
): Promise<"aprobado" | "rechazado"> {
  const [fila] = await tx.$queryRaw<{ r: string }[]>`
    SELECT "core"."remuneraciones_resolver_propuesta"(
      ${input.id}::uuid, ${input.aprobar}, ${input.actorId}::uuid
    ) AS r`;
  if (fila?.r !== "aprobado" && fila?.r !== "rechazado") {
    throw new Error("remuneraciones_resolver_propuesta devolvió un resultado inesperado");
  }
  return fila.r;
}
