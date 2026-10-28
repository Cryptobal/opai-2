import { Users } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarContactos, filtrosDe } from "./_componentes/datos";
import { ListaContactos } from "./_componentes/lista-contactos";

export const metadata = { title: "Contactos" };
type Props = { searchParams: SearchParams };

/** Contactos (Brief 07 · PR 1): lista + ficha como Personas; en teléfono, la lista. */
export default function Contactos({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Contactos"
      ruta="/contactos"
      completo
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        return { ...(await cargarContactos(p)), q: p.q };
      }}
    >
      {(l) => (
        <SplitScreen
          telefono="lista"
          unPanelHastaLg
          etiquetaLista="Lista de contactos"
          vacio={{ texto: "Elige un contacto", icono: Users }}
          lista={<ListaContactos state={l.state} items={l.items} q={l.q} />}
        />
      )}
    </PaginaPortal>
  );
}
