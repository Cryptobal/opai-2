import { FileText, Plus } from "lucide-react";

import { SplitScreen } from "@opai/ds";

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
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        return { ...(await cargarCotizaciones(p["cursor"], undefined, p["ver"] === "archivadas")), q: p.q };
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
      {(l) => (
        <SplitScreen
          telefono="lista"
          unPanelHastaLg
          etiquetaLista="Lista de cotizaciones"
          vacio={{ texto: "Elige una cotización", icono: FileText }}
          lista={
            <ListaCotizaciones
              datos={l}
              {...(l.q !== undefined && l.q !== "" ? { q: l.q } : {})}
            />
          }
        />
      )}
    </PaginaPortal>
  );
}
