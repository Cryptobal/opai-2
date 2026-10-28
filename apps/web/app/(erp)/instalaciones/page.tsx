import { MapPin } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { vocabularioActual } from "@/lib/vocabulario";

import { cargarInstalaciones } from "./_componentes/datos";
import { ListaInstalaciones } from "./_componentes/lista-instalaciones";

export const metadata = { title: "Instalaciones" };

/** Instalaciones (06): vista dividida con lista de 360/400 px; lista en teléfono. */
export default function Instalaciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Instalaciones"
      ruta="/instalaciones"
      completo
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const [l, voc] = await Promise.all([cargarInstalaciones(p), vocabularioActual()]);
        return { ...l, voc, p };
      }}
      opciones={(d) => ({ titulo: d.voc.titulo("instalacion") })}
    >
      {(d) => (
        <SplitScreen
          telefono="lista"
          unPanelHastaLg
          etiquetaLista="Lista de instalaciones"
          vacio={{ texto: `Elige una ${d.voc.instalacion.singular}`, icono: MapPin }}
          lista={
            <ListaInstalaciones
              state={d.state}
              items={d.items}
              cuentas={d.cuentas}
              titulo={d.voc.titulo("instalacion")}
              singular={d.voc.instalacion.singular}
              parametros={d.p}
            />
          }
        />
      )}
    </PaginaPortal>
  );
}
