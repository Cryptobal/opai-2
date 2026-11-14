import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarBancos } from "./_componentes/datos";
import { PantallaBancos } from "./_componentes/pantalla-bancos";

export const metadata = { title: "Bancos" };

/** Banca (CAR-97): cuentas, cartola, movimientos y conciliación; maestro-detalle desde CAR-257. */
export default function Bancos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Bancos"
      ruta="/finanzas/bancos"
      completo
      cargar={() => cargarBancos(searchParams)}
      opciones={(d) =>
        d.movId && d.gestiona
          ? { volver: { href: d.volverA, etiqueta: "Movimientos" }, volverSoloTelefono: true, volverBajoLg: true }
          : {}
      }
    >
      {(d) => <PantallaBancos {...d} />}
    </PaginaPortal>
  );
}
