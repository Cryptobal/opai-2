import type { TenantTx } from "@opai/db";

import { fechaCivil } from "./comun";
import { primerDiaMesAnterior, restarDiasCivil } from "./sii-parse";
import type { ClaveSiiPublicable } from "./sii-validacion";

export type RefVariacion =
  | { ok: true; valor: number; vigenteDesde: string }
  | { ok: true; sinReferencia: true };

export async function referenciaVariacion(
  tx: TenantTx,
  indicadorId: string,
  clave: ClaveSiiPublicable,
  vigenteDesde: string,
): Promise<RefVariacion> {
  const refDesdeExacto =
    clave === "uf" ? restarDiasCivil(vigenteDesde, 1) : primerDiaMesAnterior(vigenteDesde);
  const exacta = await tx.valorPublicado.findFirst({
    where: {
      indicadorId,
      estado: "vigente",
      vigenteDesde: new Date(`${refDesdeExacto}T12:00:00.000Z`),
    },
  });
  if (exacta) {
    return { ok: true, valor: Number(exacta.valorJson), vigenteDesde: refDesdeExacto };
  }
  const ultima = await tx.valorPublicado.findFirst({
    where: {
      indicadorId,
      estado: "vigente",
      vigenteDesde: { lt: new Date(`${vigenteDesde}T12:00:00.000Z`) },
    },
    orderBy: { vigenteDesde: "desc" },
  });
  if (!ultima) return { ok: true, sinReferencia: true };
  return {
    ok: true,
    valor: Number(ultima.valorJson),
    vigenteDesde: fechaCivil(ultima.vigenteDesde),
  };
}
