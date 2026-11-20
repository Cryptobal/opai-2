import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarPagosProveedores } from "./_componentes/datos";
import { ListaPagosProveedores } from "./_componentes/lista-pagos-proveedores";

export const metadata = { title: "Pagos a proveedores" };

/** Pagos a proveedores: total por pagar por proveedor (CAR-239, equivalente 1.0 pagos-proveedores). */
export default function PagosProveedores({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Compras"
      ruta="/finanzas/compras/pagos"
      cargar={() => cargarPagosProveedores(searchParams)}
    >
      {(d) => <ListaPagosProveedores {...d} />}
    </PaginaPortal>
  );
}