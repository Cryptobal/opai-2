import { Package } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

import { cargarTipos } from "./_componentes/datos";
import { HojaTipo } from "./_componentes/diferidas";
import { ListaTipos } from "./_componentes/lista-tipos";

export const metadata = { title: "Inventario" };

/** Inventario › Tipos (CAR-235): vista dividida con «Elige un tipo»; lista en teléfono. */
export default function Inventario({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inventario"
      ruta="/inventario"
      completo
      cargar={async () => {
        const [p, identidad] = await Promise.all([leerParametros(searchParams), requerirIdentidad("/inventario")]);
        return {
          ...(await cargarTipos(p)),
          q: p.q,
          puedeGestionar: puedeDeIdentidad(identidad)("inventario:tipos.manage"),
        };
      }}
    >
      {(d) => (
        <>
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de tipos"
            vacio={{ texto: "Elige un tipo", icono: Package }}
            lista={
              <ListaTipos
                state={d.state}
                items={d.items}
                total={d.total}
                {...(d.q ? { q: d.q } : {})}
                puedeGestionar={d.puedeGestionar}
              />
            }
          />
          {d.puedeGestionar ? <HojaTipo /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
