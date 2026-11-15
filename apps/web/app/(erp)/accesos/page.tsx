import { DoorOpen } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarRegistros } from "./_componentes/datos";
import { ListaDeAccesos } from "./_componentes/lista-registros";
import { SegmentoAccesos } from "./_componentes/segmento-accesos";

export const metadata = { title: "Accesos" };

/** Accesos (CAR-474, diseño `Accesos`): registros de todas las instalaciones a cargo, con ficha a la derecha. */
export default function Accesos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      completo
      cargar={() => cargarRegistros(searchParams)}
    >
      {(d) => (
        <>
          <SegmentoAccesos activa={d.p["estado"] === "en_sitio" ? "en_sitio" : "registros"} />
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de accesos"
            vacio={{ texto: "Elige un registro", icono: DoorOpen }}
            lista={<ListaDeAccesos d={d} />}
          />
        </>
      )}
    </PaginaPortal>
  );
}
