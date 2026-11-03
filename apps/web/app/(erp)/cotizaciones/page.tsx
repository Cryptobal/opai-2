import { Plus } from "lucide-react";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
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
      opciones={(d) =>
        d.crear
          ? {
              acciones: (
                <EnlaceBoton href="/cotizaciones/nueva" icono={Plus}>
                  Nueva cotización
                </EnlaceBoton>
              ),
            }
          : {}
      }
    >
      {(datos) => <ListaCotizaciones datos={datos} />}
    </PaginaPortal>
  );
}
