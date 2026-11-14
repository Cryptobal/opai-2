import { Plus } from "lucide-react";
import { Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, type SearchParams } from "@/lib/parametros";

import { cargarFichaActivo } from "../../_componentes/datos-activos";
import { DetalleActivo } from "../../_componentes/detalle-activo";
import { HojaActivo } from "../../_componentes/diferidas";
import { ListaActivos } from "../../_componentes/lista-activos";

export const metadata = { title: "Activo" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Activo: lista a la izquierda y ficha a la derecha; en teléfono, la ficha con «Atrás». */
export default function ActivoDetalle({ params, searchParams }: Props) {
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
          Nuevo activo
        </EnlaceBoton>
      }
      cargar={() => cargarFichaActivo(params, searchParams)}
      opciones={(d) => ({ volver: { href: conBusqueda("/inventario", d.p.q), etiqueta: "Inventario" } })}
    >
      {({ id, p, datos, lista, puedeGestionar }) => (
        <>
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista="Lista de activos"
            lista={
              <ListaActivos
                state={lista.state}
                items={lista.items}
                tipos={lista.tipos}
                seleccionada={id}
                {...(p.q ? { q: p.q } : {})}
                puedeGestionar={puedeGestionar}
              />
            }
            detalle={
              <Suspense fallback={<Loading variante="detalle" />}>
                <DetalleActivo datos={datos} puedeGestionar={puedeGestionar} />
              </Suspense>
            }
          />
          {puedeGestionar ? <HojaActivo tipos={lista.tipos} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
