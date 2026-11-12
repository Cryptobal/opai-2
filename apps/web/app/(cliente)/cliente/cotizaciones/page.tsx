import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ListaCotizaciones } from "./_componentes/lista-cotizaciones";
import type { ItemCotizacion } from "./_componentes/tipos";

export const metadata = { title: tituloPagina("cliente", "Cotizaciones") };

/**
 * Cotizaciones del Portal Cliente (08, CAR-300). Un contacto ve las enviadas a su cuenta y un prospecto solo su
 * propuesta vigente; el alcance lo aplica la capacidad en la consulta, no la pantalla (ADR-022).
 */
export default function Pagina() {
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Cotizaciones"
      ruta="/cliente/cotizaciones"
      cargando="lista"
      cargar={async () =>
        exigirDatos(await ejecutarComoUsuario<{ items: ItemCotizacion[] }>("cliente", "cpq.portal_cotizaciones.list", {}))
      }
    >
      {(r) => <ListaCotizaciones items={r.items} />}
    </PaginaPortal>
  );
}
