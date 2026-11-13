import { ChartColumn, Download, ListChecks, type LucideIcon, MoreHorizontal, UserCheck } from "lucide-react";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import { type AccionNegocios, ETIQUETA_ACCION } from "./acciones-negocios-tipos";
import { MenuAccionesNegocios } from "./menu-acciones-negocios";

export type { AccionNegocios } from "./acciones-negocios-tipos";

const ICONO: Record<AccionNegocios["id"], LucideIcon> = {
  seguimiento: ListChecks,
  reportes: ChartColumn,
  transferir: UserCheck,
  exportar: Download,
};

/**
 * Acciones secundarias de Negocios (CAR-371, Hilo: una acción principal). Desde md se ven como
 * botones; en el teléfono quedan en un menú «⋯». Los botones e íconos se pintan en el servidor y
 * solo el menú va al cliente, sin íconos, para no mover el código compartido de las demás rutas
 * (presupuesto de JS, ADR-037).
 */
export function AccionesNegocios({ acciones }: { acciones: readonly AccionNegocios[] }) {
  if (!acciones.length) return null;
  return (
    <>
      {acciones.map((a) => (
        <EnlaceBoton
          key={a.id}
          href={a.href}
          variante="secondary"
          icono={ICONO[a.id]}
          className="hidden md:inline-flex"
        >
          {ETIQUETA_ACCION[a.id]}
        </EnlaceBoton>
      ))}
      <MenuAccionesNegocios
        acciones={acciones}
        disparador={<MoreHorizontal className="size-5" aria-hidden />}
      />
    </>
  );
}
