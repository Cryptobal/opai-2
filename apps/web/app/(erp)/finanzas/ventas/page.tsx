import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { PestanasVentas } from "../_componentes/pestanas-ventas";
import { cargarVentas } from "./_componentes/datos";
import { ListaVentas } from "./_componentes/lista-ventas";

export const metadata = { title: "Ventas (DTE)" };

/** Libro de ventas · emisión DTE (CAR-137, diseño Finanzas v3 pantalla 2). */
export default function VentasPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal portal="erp" titulo="Ventas (DTE)" ruta="/finanzas/ventas" cargar={() => cargarVentas(searchParams)}>
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasVentas activa="libro" />
          <ListaVentas
            state={d.state}
            libro={d.libro}
            subtitulo={d.subtitulo}
            gestiona={d.gestiona}
            filtrado={d.filtrado}
            periodos={d.periodos}
          />
        </div>
      )}
    </PaginaPortal>
  );
}
