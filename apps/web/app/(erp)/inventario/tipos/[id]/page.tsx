import { Plus } from "lucide-react";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { conBusqueda, type SearchParams } from "@/lib/parametros";

import { cargarFichaTipo } from "../../_componentes/datos";
import { DetalleTipo } from "../../_componentes/detalle-tipo";
import { DivisionFicha } from "../../_componentes/division-ficha";
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
        <EnlaceBoton href="/inventario/tipos?nuevo=1" icono={Plus} className="max-lg:hidden">
          Nuevo tipo
        </EnlaceBoton>
      }
      cargar={() => cargarFichaTipo(params, searchParams)}
      opciones={(d) => ({ volver: { href: conBusqueda("/inventario/tipos", d.p.q), etiqueta: "Tipos" } })}
    >
      {({ id, p, datos, lista, kit, categorias, puedeGestionar }) => (
        <>
          <DivisionFicha etiqueta="Lista de tipos" lista={<ListaTipos
                {...lista}
                seleccionada={id}
                {...(p.q ? { q: p.q } : {})}
                puedeGestionar={puedeGestionar}
              />}>
            <DetalleTipo datos={datos} kit={kit} categorias={categorias} puedeGestionar={puedeGestionar} />
          </DivisionFicha>
          {puedeGestionar ? <HojaTipo kit={kit} categorias={categorias} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
