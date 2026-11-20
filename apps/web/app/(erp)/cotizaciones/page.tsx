import { FileText } from "lucide-react";

import { SplitScreen } from "@opai/ds";

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
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const datos = await cargarCotizaciones(
          p["cursor"],
          undefined,
          p["ver"] === "archivadas",
          p,
        );
        return { datos, p };
      }}
    >
      {({ datos, p }) => (
        <SplitScreen
          telefono="lista"
          unPanelHastaLg
          etiquetaLista="Lista de cotizaciones"
          vacio={{ texto: "Elige una cotización", icono: FileText }}
          lista={<ListaCotizaciones datos={datos} p={p} />}
        />
      )}
    </PaginaPortal>
  );
}
