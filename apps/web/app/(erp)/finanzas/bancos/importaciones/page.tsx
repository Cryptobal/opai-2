import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { PestanasBancos } from "../_componentes/pestanas-bancos";
import { cargarImportaciones } from "./_componentes/datos";
import { PantallaImportaciones } from "./_componentes/pantalla-importaciones";

export const metadata = { title: "Importaciones del banco" };

/** Historial de cartolas importadas por cuenta, con su saldo y «Deshacer importación» (CAR-341). */
export default function ImportacionesBanco({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Bancos"
      ruta="/finanzas/bancos/importaciones"
      cargar={() => cargarImportaciones(searchParams)}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasBancos activa="importaciones" />
          <PantallaImportaciones {...d} />
        </div>
      )}
    </PaginaPortal>
  );
}
