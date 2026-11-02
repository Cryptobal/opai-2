import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarFolios } from "./_componentes/datos";
import { PantallaFolios } from "./_componentes/pantalla-folios";

export const metadata = { title: "Folios" };

/** Folios CAF por tipo de DTE (CAR-147). */
export default function FoliosPage() {
  return (
    <PaginaPortal portal="erp" titulo="Folios" ruta="/finanzas/folios" cargar={() => cargarFolios()}>
      {(d) => <PantallaFolios {...d} />}
    </PaginaPortal>
  );
}
