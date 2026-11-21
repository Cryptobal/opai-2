import type { CategoriaConfig, PrendaConfig } from "./tipos";

export function proximasPrendas(
  todas: PrendaConfig[],
  edicion: { clave: string; nombre: string; activo: boolean } | null,
  nombre: string,
  activo: boolean,
): PrendaConfig[] {
  const n = nombre.trim();
  if (edicion) {
    return todas.map((p) => (p.clave === edicion.clave ? { ...p, nombre: n, activo } : p));
  }
  return [...todas, { clave: "", nombre: n, activo, orden: todas.length, enUso: false }];
}

export function proximasCategorias(
  todas: CategoriaConfig[],
  edicion: CategoriaConfig | null,
  datos: { nombre: string; comportamiento: CategoriaConfig["comportamiento"]; activo: boolean },
): CategoriaConfig[] {
  const n = datos.nombre.trim();
  if (edicion) {
    const bloqueada = edicion.clave === "activo" || edicion.clave === "ropa";
    return todas.map((c) =>
      c.clave === edicion.clave
        ? { ...c, nombre: n, activo: datos.activo, ...(bloqueada ? {} : { comportamiento: datos.comportamiento }) }
        : c,
    );
  }
  return [
    ...todas,
    { clave: "", nombre: n, comportamiento: datos.comportamiento, activo: datos.activo, orden: todas.length },
  ];
}