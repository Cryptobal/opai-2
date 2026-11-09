import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { PestanasVentas } from "../../../_componentes/pestanas-ventas";
import { cargarCierre } from "./_componentes/datos";
import { RUTA_CIERRE } from "./_componentes/meses";
import { PantallaCierre } from "./_componentes/pantalla-cierre";

export const metadata = { title: "Cierre de mes" };

/** Cierre de mes de facturación: borradores por etapa y emisión en lote (BRIEF-33 · CAR-167). */
export default function CierreDeMesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal portal="erp" titulo="Cierre de mes" ruta={RUTA_CIERRE} cargar={() => cargarCierre(searchParams)}>
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasVentas activa="tablero" />
          <PantallaCierre {...d} />
        </div>
      )}
    </PaginaPortal>
  );
}
