/** Permisos concretos de una key: null conserva la delegación histórica; servicio falla cerrado. */
export function permisoDeKey(
  permiso: string,
  permisos: readonly string[] | null,
  servicio: boolean,
  responsable: (permiso: string) => boolean,
): boolean {
  if (permiso.startsWith("platform:")) return false;
  if (servicio) return permisos?.includes(permiso) ?? false;
  return (permisos === null || permisos.includes(permiso)) && responsable(permiso);
}
