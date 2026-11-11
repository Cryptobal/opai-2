"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Menu } from "@opai/ds";

import { DialogoDescartarBorrador } from "./descartar-borrador";
import { tituloVenta } from "./etiquetas-venta";
import type { Venta } from "./tipos";

/**
 * Acciones de un borrador en la lista (CAR-248, CAR-261): un solo menú «⋮» por fila, así la tarjeta del teléfono no se
 * llena de botones. Editar abre la ficha con la edición; Descartar pide confirmación.
 */
export function AccionesFilaBorrador({ venta }: { venta: Venta }) {
  const router = useRouter();
  const [descartando, setDescartando] = useState(false);
  return (
    <>
      <Menu
        etiqueta={`Acciones de ${tituloVenta(venta)}`}
        disparador={<MoreVertical className="size-5" aria-hidden />}
        items={[
          { id: "editar", etiqueta: "Editar borrador", icono: Pencil, onSelect: () => router.push(`/finanzas/ventas/${venta.id}?editar=1`) },
          { id: "descartar", etiqueta: "Descartar", icono: Trash2, peligro: true, separador: true, onSelect: () => setDescartando(true) },
        ]}
      />
      {descartando ? (
        <DialogoDescartarBorrador documentoId={venta.id} etiqueta="este borrador" abierto onCerrar={() => setDescartando(false)} />
      ) : null}
    </>
  );
}
