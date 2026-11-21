import type { Identidad } from "@/lib/actor";
import { membresiasUsables } from "@/lib/tenant-actual";
import { ultimosAccesos } from "@/lib/ultimo-acceso";

/** Empresas para `SelectorEmpresa` (login y OAuth), con último acceso. */
export async function empresasParaSelector(usuarioId: string, membresias: Identidad["membresias"]) {
  const usables = membresiasUsables(membresias);
  const accesos = await ultimosAccesos(
    usuarioId,
    usables.map((m) => m.tenantId),
  );
  return usables.map((m) => ({
    tenantId: m.tenantId,
    nombre: m.tenant.nombre,
    rol: m.rol,
    ultimoAcceso: accesos.get(m.tenantId)?.toISOString() ?? null,
  }));
}