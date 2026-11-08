import { forTenant, type TenantTx } from "@opai/db";
import { esMembresiaDeCliente, instalacionesVisibles, type Rol } from "@opai/domain";

/**
 * Alcance por filas de un contacto de cliente (Portal Cliente, CAR-88, ADR-022): las instalaciones
 * que su acceso habilita, y la lista vacía (no ve nada) si no tiene un acceso `activo`. Devuelve
 * null para una membresía que no es de cliente. Defensa en profundidad: el rol sistema del contacto
 * ya limita sus permisos al portal, y cada capacidad del portal resuelve su acceso por su cuenta.
 */
export async function instalacionesDeContactoCliente(
  tenantId: string,
  m: { id: string; rol: string; portales: string[] },
  db: TenantTx = forTenant(tenantId),
): Promise<string[] | null> {
  if (!esMembresiaDeCliente(m.rol as Rol, m.portales)) return null;
  const acceso = await db.accesoCliente.findUnique({
    where: { tenantId_membershipId: { tenantId, membershipId: m.id } },
    include: { instalaciones: { select: { instalacionId: true } } },
  });
  if (!acceso || acceso.estado !== "activo") return [];
  const instalaciones = await db.instalacion.findMany({
    where: { cuentaId: acceso.cuentaId },
    select: { id: true, cuentaId: true, estado: true, archivadaEn: true },
  });
  return instalacionesVisibles(
    {
      estado: acceso.estado,
      cuentaId: acceso.cuentaId,
      todasInstalaciones: acceso.todasInstalaciones,
      instalaciones: acceso.instalaciones.map((i) => i.instalacionId),
    },
    instalaciones.map((i) => ({
      id: i.id,
      cuentaId: i.cuentaId,
      estado: i.estado,
      archivada: i.archivadaEn !== null,
    })),
  );
}
