import { PaginaPortal } from "@/app/_components/pagina-portal";
import { hoyIso } from "@/lib/fechas";

import { cargarOpciones } from "./datos";
import { FormKm } from "./nueva/form-km";
import { BASE, type PortalRendicion } from "./tipos";

/** Nueva rendición de kilometraje: pantalla completa en teléfono. */
export function PaginaKilometraje({ portal }: { portal: PortalRendicion }) {
  const base = BASE[portal];
  return (
    <PaginaPortal
      portal={portal}
      titulo="Nueva rendición"
      ruta={`${base}/nueva/kilometraje`}
      cargando="formulario"
      volver={{ href: `${base}/nueva`, etiqueta: "Nueva rendición" }}
      cargar={() => cargarOpciones(portal)}
    >
      {(opciones) => <FormKm portal={portal} opciones={opciones} hoy={hoyIso()} />}
    </PaginaPortal>
  );
}
