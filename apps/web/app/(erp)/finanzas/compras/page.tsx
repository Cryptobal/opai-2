import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { PestanasCompras } from "../_componentes/pestanas-compras";
import { cargarLibro } from "./_componentes/datos";
import { HojaCompra, HojaLote, HojaRcv } from "./_componentes/diferidas";
import { LibroCompras } from "./_componentes/libro-compras";

export const metadata = { title: "Compras" };

/** Libro de compras (01): documentos recibidos, centro de costo y plazo para aceptar o reclamar. */
export default function Compras({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Compras"
      ruta="/finanzas/compras"
      cargar={() => cargarLibro(searchParams)}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasCompras activa="libro" />
          <LibroCompras
            state={d.state}
            libro={d.libro}
            centros={d.centros}
            gestiona={d.gestiona}
            filtrado={d.filtrado}
          />
          {d.gestiona ? (
            <>
              <HojaCompra proveedores={d.proveedores} centros={d.centros} puedeCrearProveedores={d.puedeCrearProveedores} />
              <HojaRcv puedeCrearProveedores={d.puedeCrearProveedores} />
              <HojaLote
                centros={d.centros}
                documentos={(d.libro?.items ?? []).filter((c) => !c.centroCostoId)}
              />
            </>
          ) : null}
        </div>
      )}
    </PaginaPortal>
  );
}
