export type Vista = "en_sitio" | "registros" | "listas";

/** Ruta de Accesos del Portal Cliente; «En sitio» es la vista por defecto y no va en la URL. */
export function ruta(q: {
  instalacion?: string | undefined;
  vista?: Vista;
  lista?: string;
  cursor?: string;
}): string {
  const p = new URLSearchParams(
    Object.entries({ ...q, vista: q.vista === "en_sitio" ? undefined : q.vista }).filter(
      (e): e is [string, string] => Boolean(e[1]),
    ),
  );
  return `/cliente/accesos${p.size ? `?${p}` : ""}`;
}
