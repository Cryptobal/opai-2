"use client";

import { Pencil } from "lucide-react";

import { LinkNext } from "@/app/_components/link-next";

import { DescartarBorrador } from "./descartar-borrador";
import { tituloVenta } from "./etiquetas-venta";
import type { Venta } from "./tipos";

/** Acciones de un borrador en la lista (CAR-248): editarlo (abre su ficha con la edición) o descartarlo. */
export function AccionesFilaBorrador({ venta }: { venta: Venta }) {
  return (
    <span className="flex items-center gap-1">
      <LinkNext href={`/finanzas/ventas/${venta.id}?editar=1`} aria-label={`Editar ${tituloVenta(venta)}`} className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm text-fg hover:bg-fill">
        <Pencil className="size-4" aria-hidden /> Editar
      </LinkNext>
      <DescartarBorrador documentoId={venta.id} etiqueta="este borrador" variante="ghost" />
    </span>
  );
}
