import { Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, type SearchParams } from "@/lib/parametros";

import { cargarFichaRopa } from "../../_componentes/datos-ropa";
import { DetalleRopa } from "../../_componentes/detalle-ropa";
import { ListaRopa } from "../../_componentes/lista-ropa";

export const metadata = { title: "Ropa" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tipo de ropa: lista a la izquierda y existencias a la derecha; en teléfono, la ficha con «Atrás». */
export default function RopaDetalle({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inventario"
      ruta="/inventario"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      cargar={() => cargarFichaRopa(params, searchParams)}
      opciones={(d) => ({ volver: { href: conBusqueda("/inventario/ropa", d.p.q), etiqueta: "Ropa" } })}
    >
      {({ id, p, datos, lista, puedeGestionar }) => (
        <SplitScreen
          telefono="detalle"
          unPanelHastaLg
          etiquetaLista="Lista de ropa"
          lista={<ListaRopa state={lista.state} items={lista.items} seleccionada={id} {...(p.q ? { q: p.q } : {})} />}
          detalle={
            <Suspense fallback={<Loading variante="detalle" />}>
              <DetalleRopa datos={datos} puedeGestionar={puedeGestionar} />
            </Suspense>
          }
        />
      )}
    </PaginaPortal>
  );
}
