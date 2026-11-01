import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { PestanasCompras } from "../../_componentes/pestanas-compras";
import { cargarProveedores } from "./_componentes/datos";
import { HojaProveedor } from "./_componentes/diferidas";
import { ListaProveedores } from "./_componentes/lista-proveedores";

export const metadata = { title: "Proveedores" };

/** Proveedores (02): catálogo con plazo de pago, cuenta y centro de costo por defecto. */
export default function Proveedores({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Compras"
      ruta="/finanzas/compras/proveedores"
      cargar={() => cargarProveedores(searchParams)}
    >
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasCompras activa="proveedores" />
          <ListaProveedores state={d.state} items={d.items} gestiona={d.gestiona} filtrado={d.filtrado} />
          {d.gestiona ? <HojaProveedor cuentas={d.cuentas} centros={d.centros} /> : null}
        </div>
      )}
    </PaginaPortal>
  );
}
