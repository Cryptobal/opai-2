import { Plus } from "lucide-react";
import { Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, type SearchParams } from "@/lib/parametros";

import { cargarFichaTipo } from "../../_componentes/datos";
import { DetalleTipo } from "../../_componentes/detalle-tipo";
import { HojaTipo } from "../../_componentes/diferidas";
import { ListaTipos } from "../../_componentes/lista-tipos";

export const metadata = { title: "Tipo de inventario" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Tipo de inventario: lista a la izquierda y ficha a la derecha; en teléfono, la ficha con «Atrás». */
export default function TipoDetalle({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Inventario"
      ruta="/inventario"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      acciones={
        <EnlaceBoton href="/inventario?nuevo=1" icono={Plus} className="max-lg:hidden">
          Nuevo tipo
        </EnlaceBoton>
      }
      cargar={() => cargarFichaTipo(params, searchParams)}
      opciones={(d) => ({ volver: { href: conBusqueda("/inventario", d.p.q), etiqueta: "Inventario" } })}
    >
      {({ id, p, datos, lista, puedeGestionar }) => (
        <>
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista="Lista de tipos"
            lista={
              <ListaTipos
                state={lista.state}
                items={lista.items}
                total={lista.total}
                seleccionada={id}
                {...(p.q ? { q: p.q } : {})}
                puedeGestionar={puedeGestionar}
              />
            }
            detalle={
              <Suspense fallback={<Loading variante="detalle" />}>
                <DetalleTipo datos={datos} puedeGestionar={puedeGestionar} />
              </Suspense>
            }
          />
          {puedeGestionar ? <HojaTipo /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
