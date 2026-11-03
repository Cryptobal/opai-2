// Reversión de una corrida: borra creados y restaura valores previos de completados.
import type { TenantTx } from "../../../src/transaccion";

export type ResultadoRevertir = {
  revertidos: number;
  bloqueados: { entidad: string; idOpai1: string; motivo: string }[];
};

export async function revertirCorrida(
  tx: TenantTx,
  tenantId: string,
  importacionId: string,
  dryRun: boolean,
): Promise<ResultadoRevertir> {
  const filas = await tx.importacionFila.findMany({
    where: { tenantId, importacionId },
    orderBy: { createdAt: "desc" },
  });
  let revertidos = 0;
  const bloqueados: ResultadoRevertir["bloqueados"] = [];
  for (const f of filas) {
    if (f.accion === "creado" && f.idOpai2) {
      if (!dryRun) await borrarEntidad(tx, f.entidad, f.idOpai2);
      revertidos += 1;
    } else if (f.accion === "completado" && f.idOpai2 && f.valoresPrevios) {
      const ok = await restaurar(tx, f.entidad, f.idOpai2, f.valoresPrevios as Record<string, unknown>);
      if (!ok) bloqueados.push({ entidad: f.entidad, idOpai1: f.idOpai1, motivo: "modificado_despues" });
      else revertidos += 1;
    }
  }
  if (!dryRun)
    await tx.importacion.update({
      where: { id: importacionId },
      data: { estado: "revertida" },
    });
  return { revertidos, bloqueados };
}

async function borrarEntidad(tx: TenantTx, entidad: string, id: string) {
  if (entidad === "cuenta") await tx.cuenta.delete({ where: { id } });
  else if (entidad === "contacto") await tx.contacto.delete({ where: { id } });
  else if (entidad === "instalacion") await tx.instalacion.delete({ where: { id } });
  else if (entidad === "negocio") await tx.negocio.delete({ where: { id } });
}

async function restaurar(
  tx: TenantTx,
  entidad: string,
  id: string,
  previos: Record<string, unknown>,
): Promise<boolean> {
  if (entidad === "cuenta") {
    const actual = await tx.cuenta.findFirst({ where: { id } });
    if (!actual) return false;
    if (Object.keys(previos).some((k) => actual[k as keyof typeof actual] !== previos[k])) return false;
    await tx.cuenta.update({ where: { id }, data: previos });
    return true;
  }
  if (entidad === "instalacion") {
    const actual = await tx.instalacion.findFirst({ where: { id } });
    if (!actual) return false;
    await tx.instalacion.update({ where: { id }, data: previos });
    return true;
  }
  return false;
}
