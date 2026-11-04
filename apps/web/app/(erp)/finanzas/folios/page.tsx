import { PaginaConfig } from "@/app/(erp)/configuracion/_centro/pagina-config";

import { cargarFolios } from "./_componentes/datos";
import { PantallaFolios } from "./_componentes/pantalla-folios";

export const metadata = { title: "Folios" };

/** Folios CAF por tipo de DTE (CAR-147). */
export default function FoliosPage() {
  return (
    <PaginaConfig
      seccion="folios"
      titulo="Folios"
      cargar={() => cargarFolios()}
      cabecera={() => ({
        subtitulo: "Facturación · rangos autorizados por CAF",
      })}
    >
      {(d) => <PantallaFolios {...d} />}
    </PaginaConfig>
  );
}
