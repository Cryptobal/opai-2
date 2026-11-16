import type { Parametros } from "@/lib/parametros";

const CLAVES = ["q", "estado", "cuenta", "responsable", "desde", "hasta", "ver", "cursor", "prev", "limite"] as const;

/** Conserva búsqueda, filtros y paginación al abrir una ficha de cotización. */
export function conFiltrosCotizaciones(ruta: string, p: Parametros = {}, cambios?: Record<string, string | null>) {
  const qs = new URLSearchParams();
  const merged = { ...p, ...cambios };
  for (const clave of CLAVES) {
    const valor = merged[clave];
    if (valor) qs.set(clave, valor);
  }
  const texto = qs.toString();
  return texto ? `${ruta}?${texto}` : ruta;
}