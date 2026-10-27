/**
 * Permisos concretos de una key: null conserva la delegación histórica (sin lista propia); servicio
 * falla cerrado (su lista es obligatoria). En ambos casos el permiso además debe estar entre los
 * efectivos actuales del responsable (rol, personalizado y excepciones): nadie, ni la key, supera a
 * su responsable, y si este baja de rol o pierde un permiso, la key lo pierde al vuelo (H15).
 */
export function permisoDeKey(
  permiso: string,
  permisos: readonly string[] | null,
  servicio: boolean,
  responsable: (permiso: string) => boolean,
): boolean {
  if (permiso.startsWith("platform:")) return false;
  const enLista = servicio
    ? (permisos?.includes(permiso) ?? false)
    : permisos === null || permisos.includes(permiso);
  return enLista && responsable(permiso);
}
