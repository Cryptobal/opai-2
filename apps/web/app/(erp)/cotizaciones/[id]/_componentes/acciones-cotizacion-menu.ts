import { Copy, Eye, GitBranch, Pencil } from "lucide-react";

import type { ItemMenu } from "@opai/ds";

type Ejecutar = (id: string, input: unknown) => Promise<unknown | null>;

/** Menú «Más acciones» de la cotización en teléfono (vista previa, clonar y nueva versión). */
export function itemsMenuCotizacion(p: {
  cotizacionId: string;
  gestionar: boolean;
  puedeNuevaVersion: boolean;
  puedeReabrir: boolean;
  onVistaPrevia?: (() => void) | undefined;
  ejecutar: Ejecutar;
  limpiarError: () => void;
  onHecho: () => void;
}): ItemMenu[] {
  const items: ItemMenu[] = [];
  if (p.onVistaPrevia) {
    items.push({
      id: "preview-pdf",
      etiqueta: "Vista previa PDF",
      icono: Eye,
      onSelect: p.onVistaPrevia,
    });
  }
  if (!p.gestionar) return items;
  items.push({
    id: "clonar",
    etiqueta: "Clonar",
    icono: Copy,
    onSelect: () => {
      p.limpiarError();
      void p
        .ejecutar("cpq.cotizaciones.clonar", { id: p.cotizacionId })
        .then((r) => r != null && p.onHecho());
    },
  });
  if (p.puedeReabrir) {
    items.push({
      id: "reabrir",
      etiqueta: "Reabrir para editar",
      icono: Pencil,
      onSelect: () => {
        p.limpiarError();
        void p.ejecutar("cpq.cotizaciones.reabrir", { id: p.cotizacionId }).then((r) => r != null && p.onHecho());
      },
    });
  }
  if (p.puedeNuevaVersion) {
    items.push({
      id: "nueva-version",
      etiqueta: "Nueva versión",
      icono: GitBranch,
      onSelect: () => {
        p.limpiarError();
        void p
          .ejecutar("cpq.versiones.crear", { cotizacionId: p.cotizacionId })
          .then((r) => r != null && p.onHecho());
      },
    });
  }
  return items;
}
