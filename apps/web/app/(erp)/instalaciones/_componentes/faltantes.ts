import type { DatosInstalacion } from "./campos-instalacion";

/** Qué falta para poder crear la instalación, en palabras del usuario (vacío = lista para crear). */
export function faltantesInstalacion(d: DatosInstalacion, cuentaId: string | null): string[] {
  const f: string[] = [];
  if (!cuentaId) f.push("elegir la cuenta");
  if (d.nombre.trim().length < 2) f.push("escribir el nombre");
  if (d.vigencia.desde && d.vigencia.hasta && d.vigencia.hasta < d.vigencia.desde)
    f.push("corregir la vigencia (el término es anterior al inicio)");
  return f;
}
