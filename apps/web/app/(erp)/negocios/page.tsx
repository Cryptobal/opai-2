import { Briefcase } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";
import { puedeExportarNegocios, puedeGestionarNegocios } from "@/lib/pestanas-modulos";

import { cargarEmbudo, cargarEtapas, cargarNegocios, filtrosDe } from "./_componentes/datos";
import { cargarHojas } from "./_componentes/hojas/datos-hojas";
import { HojasNegocio } from "./_componentes/hojas/hojas-negocio";
import { ListaNegocios } from "./_componentes/lista-negocios";
import { urlExportarNegocios } from "./_componentes/rutas";
import { accionNuevo, TableroNegocios } from "./_componentes/tablero/tablero-negocios";

export const metadata = { title: "Negocios" };
type Props = { searchParams: SearchParams };

/**
 * Negocios (Brief 07 · PR 1b): tablero por defecto, como el export; `?vista=lista` conserva la vista
 * dividida con "Elige un negocio". Las dos vistas llevan el cambio Tablero/Lista, que conserva la
 * búsqueda, el estado y la etapa (CAR-33). Las hojas (nuevo, mover, ganar, perder) se abren por la URL.
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
        const [tablero, filas, etapas, gestiona, exporta] = await Promise.all([
          lista ? null : cargarEmbudo(),
          lista ? cargarNegocios(p) : null,
          lista ? cargarEtapas() : [],
          puedeGestionarNegocios(),
          puedeExportarNegocios(),
        ]);
        // Sin comercial:negocios.manage no se cargan ni montan hojas (aunque la URL traiga ?nuevo=1).
        const hojas = gestiona ? await cargarHojas(p) : null;
        return { p, tablero, filas, etapas, hojas, gestiona, exporta };
      }}
      opciones={(d) => (d.gestiona ? { acciones: accionNuevo } : {})}
    >
      {(d) => (
        <>
          {d.tablero ? (
            <TableroNegocios
              {...d.tablero}
              gestiona={d.gestiona}
              etapa={d.p["etapa"]}
              // En el tablero `?etapa=` solo elige la columna visible: el Excel lleva todas las etapas.
              {...(d.exporta ? { exportar: urlExportarNegocios({ ...d.p, etapa: undefined }) } : {})}
            />
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
                  p={d.p}
                  etapas={d.etapas}
                  etiquetas={d.filas?.etiquetas ?? []}
                  {...(d.gestiona ? { nuevo: accionNuevo } : {})}
                  puedeExportar={d.exporta}
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
