import type { Parametros } from "@/lib/parametros";

/** Conserva búsqueda, filtros y paginación al abrir una ficha de cotización. */
export function conFiltrosCotizaciones(ruta: string, p: Parametros = {}) {
  const qs = new URLSearchParams();
  for (const clave of ["q", "estado", "cuenta", "responsable", "desde", "hasta", "ver", "cursor", "prev"]) {
    const valor = p[clave];
    if (valor) qs.set(clave, valor);
  }
  const texto = qs.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}