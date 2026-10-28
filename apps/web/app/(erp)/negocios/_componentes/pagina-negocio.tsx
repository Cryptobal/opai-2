import { type ReactNode, Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { Parametros, SearchParams } from "@/lib/parametros";

import { cargarEtapas, cargarNegocio, cargarNegocios, filtrosDe } from "./datos";
import type { NegocioDetalle } from "./datos";
import { DetalleNegocio } from "./detalle-negocio";
import { ListaNegocios } from "./lista-negocios";
import { volverANegocios } from "./rutas";
import type { TabNegocio } from "./ficha-negocio";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
  tab: TabNegocio;
  children: (negocio: NegocioDetalle, p: Parametros) => ReactNode;
};

/** Toda pestaña de un negocio: la lista a la izquierda y la ficha a la derecha; en teléfono, el detalle con "Atrás". */
export function PaginaNegocio({ params, searchParams, tab, children }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Negocios"
      ruta="/negocios"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      opciones={(d) => ({
        volver: { href: volverANegocios(d.p), etiqueta: "Negocios" },
      })}
      cargar={async () => {
        const [{ id }, p] = await Promise.all([params, filtrosDe(searchParams)]);
        const datos = cargarNegocio(id);
        datos.catch(() => undefined);
        const [lista, etapas] = await Promise.all([cargarNegocios(p), cargarEtapas()]);
        return { id, p, datos, lista, etapas };
      }}
    >
      {({ id, p, datos, lista, etapas }) => (
        <SplitScreen
          telefono="detalle"
          unPanelHastaLg
          etiquetaLista="Lista de negocios"
          lista={
            <ListaNegocios
              state={lista.state}
              items={lista.items}
              seleccionado={id}
              p={p}
              etapas={etapas}
            />
          }
          detalle={
            <Suspense fallback={<Loading variante="detalle" />}>
              <DetalleNegocio datos={datos} p={p} tab={tab}>
                {children}
              </DetalleNegocio>
            </Suspense>
          }
        />
      )}
    </PaginaPortal>
  );
}
