import { Package } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";

import { cargarActivos } from "./_componentes/datos-activos";
import { HojaActivo } from "./_componentes/diferidas";
import { ListaActivos } from "./_componentes/lista-activos";
import { contextoPagina } from "./_componentes/paginas";

export const metadata = { title: "Inventario" };

/** Inventario › Activos (CAR-236): vista dividida con «Elige un activo»; lista en teléfono. */
export default function Inventario({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inventario"
      ruta="/inventario"
      completo
      cargar={async () => {
        const { p, puede } = await contextoPagina(searchParams, "/inventario", "inventario:gestionar");
        return {
          ...(await cargarActivos(p)),
          q: p.q,
          puedeGestionar: puede,
        };
      }}
    >
      {(d) => (
        <>
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de activos"
            vacio={{ texto: "Elige un activo", icono: Package }}
            lista={
              <ListaActivos
                state={d.state}
                items={d.items}
                tipos={d.tipos}
                {...(d.q ? { q: d.q } : {})}
                puedeGestionar={d.puedeGestionar}
              />
            }
          />
          {d.puedeGestionar ? <HojaActivo tipos={d.tipos} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
