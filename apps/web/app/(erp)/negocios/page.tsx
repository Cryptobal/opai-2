import { Briefcase } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";
import { puedeGestionarNegocios } from "@/lib/pestanas-modulos";

import { cargarEmbudo, cargarNegocios, filtrosDe } from "./_componentes/datos";
import { cargarHojas } from "./_componentes/hojas/datos-hojas";
import { HojasNegocio } from "./_componentes/hojas/hojas-negocio";
import { ListaNegocios } from "./_componentes/lista-negocios";
import { accionNuevo, TableroNegocios } from "./_componentes/tablero/tablero-negocios";

export const metadata = { title: "Negocios" };
type Props = { searchParams: SearchParams };

/**
 * Negocios (Brief 07 · PR 1b): tablero por defecto, como el export; `?vista=lista` conserva la vista
 * dividida con "Elige un negocio". Las hojas (nuevo, mover, ganar, perder) se abren por la URL.
 */
export default function Negocios({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Negocios"
      ruta="/negocios"
      completo
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        const lista = p["vista"] === "lista";
        const [tablero, filas, gestiona] = await Promise.all([
          lista ? null : cargarEmbudo(),
          lista ? cargarNegocios(p) : null,
          puedeGestionarNegocios(),
        ]);
        // Sin comercial:negocios.manage no se cargan ni montan hojas (aunque la URL traiga ?nuevo=1).
        const hojas = gestiona ? await cargarHojas(p) : null;
        return { q: p["q"], tablero, filas, hojas, gestiona };
      }}
      opciones={(d) => (d.gestiona ? { acciones: accionNuevo } : {})}
    >
      {(d) => (
        <>
          {d.tablero ? (
            <TableroNegocios {...d.tablero} gestiona={d.gestiona} />
          ) : (
            <SplitScreen
              telefono="lista"
              unPanelHastaLg
              etiquetaLista="Lista de negocios"
              vacio={{ texto: "Elige un negocio", icono: Briefcase }}
              lista={
                <ListaNegocios
                  state={d.filas?.state ?? "error"}
                  items={d.filas?.items ?? []}
                  q={d.q}
                />
              }
            />
          )}
          <HojasNegocio h={d.hojas} />
        </>
      )}
    </PaginaPortal>
  );
}
