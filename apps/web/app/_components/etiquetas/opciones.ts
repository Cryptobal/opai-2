import { cache } from "react";

import { esUuid } from "@/lib/ids";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { EtiquetaFila } from "./tipos";

export type OpcionEtiqueta = { valor: string; etiqueta: string };

/**
 * Opciones del filtro «Etiqueta» (`?etiqueta=`) de las listas de Comercial: el catálogo activo.
 * Sin permiso de leer etiquetas devuelve vacío y el filtro no aparece. Una lectura por request.
 */
export const cargarOpcionesEtiqueta = cache(async (): Promise<OpcionEtiqueta[]> => {
  const r = await ejecutarComoUsuario<EtiquetaFila[]>("erp", "core.etiquetas.list", {});
  return r.ok ? r.data.map((e) => ({ valor: e.id, etiqueta: e.nombre })) : [];
});

/** Parámetro de la capacidad a partir de `?etiqueta=` (solo si es un id válido). */
export const filtroEtiquetaDe = (f: Record<string, string | undefined>) =>
  f["etiqueta"] && esUuid(f["etiqueta"]) ? { etiquetaId: f["etiqueta"] } : {};

/** Filtro de chips «Etiqueta» para `ListaMaestro`, solo si el catálogo tiene opciones. */
export const filtroDeEtiquetas = (opciones: readonly OpcionEtiqueta[]) =>
  opciones.length ? [{ param: "etiqueta", etiqueta: "Etiqueta", opciones }] : [];
