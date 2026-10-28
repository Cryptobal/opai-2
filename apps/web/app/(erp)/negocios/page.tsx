import { Briefcase } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarNegocios, filtrosDe } from "./_componentes/datos";
import { ListaNegocios } from "./_componentes/lista-negocios";

export const metadata = { title: "Negocios" };
type Props = { searchParams: SearchParams };

/** Negocios (Brief 07 · PR 1): vista dividida en md+ con "Elige un negocio"; lista en teléfono. */
export default function Negocios({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Negocios"
      ruta="/negocios"
      completo
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        return { ...(await cargarNegocios(p)), q: p.q };
      }}
    >
      {(l) => (
        <SplitScreen
          telefono="lista"
          unPanelHastaLg
          etiquetaLista="Lista de negocios"
          vacio={{ texto: "Elige un negocio", icono: Briefcase }}
          lista={<ListaNegocios state={l.state} items={l.items} q={l.q} />}
        />
      )}
    </PaginaPortal>
  );
}
