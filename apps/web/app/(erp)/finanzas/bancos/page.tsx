import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarBancos } from "./_componentes/datos";
import { PantallaBancos } from "./_componentes/pantalla-bancos";
import { PestanasBancos } from "./_componentes/pestanas-bancos";

export const metadata = { title: "Bancos" };

/** Banca (CAR-97): cuentas, cartola, movimientos y conciliación. */
export default function Bancos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal portal="erp" titulo="Bancos" ruta="/finanzas/bancos" cargar={() => cargarBancos(searchParams)}>
      {(d) => (
        <div className="flex flex-col gap-4">
          <PestanasBancos activa="movimientos" />
          <PantallaBancos {...d} />
        </div>
      )}
    </PaginaPortal>
  );
}
