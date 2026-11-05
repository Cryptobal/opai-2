import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso } from "@/lib/fechas";

import { cargarOpciones } from "./datos";
import { FormCompra } from "./nueva/form-compra";
import { BASE, type PortalRendicion } from "./tipos";

/** Nueva rendición de compra: pantalla completa en teléfono. */
export function PaginaCompra({ portal }: { portal: PortalRendicion }) {
  const base = BASE[portal];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Nueva rendición"
      ruta={`${base}/nueva/compra`}
      cargando="formulario"
      volver={{ href: `${base}/nueva`, etiqueta: "Nueva rendición" }}
      cargar={() => cargarOpciones(portal)}
    >
      {(opciones) => <FormCompra portal={portal} opciones={opciones} hoy={hoyIso()} />}
    </PaginaPortal>
  );
}
