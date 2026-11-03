import type { TenantTx } from "./transaccion";

export type ClaveSiiPublicable = "uf" | "utm";

export type PublicarSiiInput = {
  clave: ClaveSiiPublicable;
  valor: number;
  vigenteDesde: string;
  fuente: string;
  consultadaEn: Date;
};

/** Lock transaccional para serializar la escritura de una corrida global de captura SII. */
export async function tryLockCapturaSiiXact(tx: TenantTx): Promise<boolean> {
  const [fila] = await tx.$queryRaw<{ ok: boolean }[]>`
    SELECT pg_try_advisory_xact_lock(hashtextextended('core:remuneraciones:captura_sii', 0)) AS ok`;
  return !!fila?.ok;
}

/** Publica UF/UTM del SII en valores_publicados (SECURITY DEFINER). */
export async function remuneracionesPublicarSii(tx: TenantTx, input: PublicarSiiInput): Promise<string> {
  const [fila] = await tx.$queryRaw<{ id: string }[]>`
    SELECT "core"."remuneraciones_publicar_sii"(
      ${input.clave},
      ${input.valor}::bigint,
      ${input.vigenteDesde}::date,
      ${input.fuente},
      ${input.consultadaEn}
    ) AS id`;
  const id = fila?.id;
  if (!id) throw new Error("remuneraciones_publicar_sii no devolvió id");
  return id;
}
