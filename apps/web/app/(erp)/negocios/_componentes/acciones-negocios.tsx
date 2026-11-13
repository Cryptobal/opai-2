"use client";

import { ChartColumn, Download, ListChecks, type LucideIcon, MoreHorizontal, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Menu } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

/** Acción secundaria de Negocios. El ícono se elige aquí: un componente no cruza al cliente. */
export type AccionNegocios = {
  id: "seguimiento" | "reportes" | "transferir" | "exportar";
  href: string;
};

const DEF: Record<AccionNegocios["id"], { etiqueta: string; icono: LucideIcon }> = {
  seguimiento: { etiqueta: "Pendientes de seguimiento", icono: ListChecks },
  reportes: { etiqueta: "Reportes", icono: ChartColumn },
  transferir: { etiqueta: "Transferir cartera", icono: UserCheck },
  exportar: { etiqueta: "Exportar a Excel", icono: Download },
};

/**
 * Acciones secundarias de Negocios (CAR-371, Hilo: una acción principal). Desde md se ven como
 * botones; en el teléfono quedan en un menú «⋯» para que el tablero aparezca de inmediato.
 * «Exportar a Excel» es una descarga: navega por documento, no por el router.
 */
export function AccionesNegocios({ acciones }: { acciones: readonly AccionNegocios[] }) {
  const router = useRouter();
  if (!acciones.length) return null;
  const ir = (a: AccionNegocios) =>
    a.id === "exportar" ? window.location.assign(a.href) : router.push(a.href);
  return (
    <>
      {acciones.map((a) => (
        <EnlaceBoton
          key={a.id}
          href={a.href}
          variante="secondary"
          icono={DEF[a.id].icono}
          className="hidden md:inline-flex"
        >
          {DEF[a.id].etiqueta}
        </EnlaceBoton>
      ))}
      <Menu
        className="md:hidden"
        etiqueta="Más acciones de negocios"
        disparador={<MoreHorizontal className="size-5" aria-hidden />}
        items={acciones.map((a) => ({
          id: a.id,
          etiqueta: DEF[a.id].etiqueta,
          icono: DEF[a.id].icono,
          onSelect: () => ir(a),
        }))}
      />
    </>
  );
}
