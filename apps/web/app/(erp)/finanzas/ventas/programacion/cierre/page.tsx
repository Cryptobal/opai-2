import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarCierre, RUTA_CIERRE } from "./_componentes/datos";
import { PantallaCierre } from "./_componentes/pantalla-cierre";

export const metadata = { title: "Cierre de mes" };

/** Cierre de mes de facturación: borradores por etapa y emisión en lote (BRIEF-33 · CAR-167). */
export default function CierreDeMesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal portal="erp" titulo="Cierre de mes" ruta={RUTA_CIERRE} cargar={() => cargarCierre(searchParams)}>
      {(d) => <PantallaCierre {...d} />}
    </PaginaPortal>
  );
}
