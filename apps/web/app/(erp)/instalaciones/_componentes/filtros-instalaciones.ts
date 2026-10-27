import type { Parametros } from "@/lib/parametros";

/** Conserva solo los filtros de la lista, no los de la ficha ni los de Puestos. */
export function conFiltrosInstalaciones(ruta: string, p: Parametros) {
  const filtros = new URLSearchParams();
  for (const clave of ["q", "estado", "cuenta", "region", "cursor", "prev"]) {
    const valor = p[clave];
    if (valor) filtros.set(clave, valor);
  }
  const busqueda = filtros.toString();
  return busqueda ? `${ruta}?${busqueda}` : ruta;
}
