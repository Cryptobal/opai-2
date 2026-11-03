// Registro de corrida en core.importaciones (escritura vía enTransaccion).
import type { TenantTx } from "../../../src/transaccion";
import {
  CONTRATO_OPAI1,
  ORIGEN_OPAI1,
  type ConteosCorrida,
  type ModoCorrida,
  conteosVacios,
} from "./corrida-tipos";

export type NuevaCorrida = {
  tenantId: string;
  modo: ModoCorrida;
  lanzadoPorId: string | null;
};

export async function registrarCorrida(tx: TenantTx, input: NuevaCorrida): Promise<string> {
  const c = await tx.importacion.create({
    data: {
      tenantId: input.tenantId,
      origen: ORIGEN_OPAI1,
      contratoVersion: CONTRATO_OPAI1,
      modo: input.modo,
      estado: "en_curso",
      conteos: conteosVacios(),
      lanzadoPorId: input.lanzadoPorId,
    },
    select: { id: true },
  });
  return c.id;
}

export async function cerrarCorrida(
  tx: TenantTx,
  importacionId: string,
  conteos: ConteosCorrida,
  estado: "completada" | "revertida" | "fallida",
) {
  await tx.importacion.update({
    where: { id: importacionId },
    data: { estado, conteos },
  });
}

export async function tenantImportacionCerrada(tx: TenantTx, tenantId: string): Promise<boolean> {
  const t = await tx.tenant.findFirst({
    where: { id: tenantId },
    select: { importacionCerradaEn: true },
  });
  return t?.importacionCerradaEn != null;
}
