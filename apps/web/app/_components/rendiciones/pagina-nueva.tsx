import { Cabecera, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";

import { BASE, type PortalRendicion } from "./tipos";

/** Nueva rendición: primero se elige compra o kilometraje; cada una es una pantalla completa en teléfono. */
export function PaginaNueva({ portal }: { portal: PortalRendicion }) {
  const base = BASE[portal];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Nueva rendición"
      ruta={`${base}/nueva`}
      cargando="formulario"
      volver={{ href: base, etiqueta: "Mis rendiciones" }}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Cabecera titulo="Nueva rendición" subtitulo="¿Qué quieres rendir?" tituloSiempre />
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <FilaSeleccionable
            href={`${base}/nueva/compra`}
            Link={LinkNext}
            titulo="Compra con boleta"
            secundario="Sube la boleta o factura de lo que pagaste."
          />
          <FilaSeleccionable
            href={`${base}/nueva/kilometraje`}
            Link={LinkNext}
            titulo="Kilometraje"
            secundario="Un viaje en tu vehículo: el monto se calcula solo."
          />
        </div>
      </div>
    </PaginaPortal>
  );
}
