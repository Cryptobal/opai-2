import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { cargarCotizaciones } from "./_componentes/datos";
import { ListaCotizaciones } from "./_componentes/lista-cotizaciones";

export const metadata = { title: "Cotizaciones" };
export default function Cotizaciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Cotizaciones"
      ruta="/cotizaciones"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return cargarCotizaciones(p["cursor"]);
      }}
    >
      {(datos) => <ListaCotizaciones datos={datos} />}
    </PaginaPortal>
  );
}
