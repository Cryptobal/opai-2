import { Suspense } from "react";

import { Loading, SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { conBusqueda, leerParametros, type SearchParams } from "@/lib/parametros";

import { AbrirPeriodo } from "../_componentes/abrir-periodo";
import { cargarPeriodos, mesSugerido, permisosNomina } from "../_componentes/datos";
import { DetallePeriodo } from "../_componentes/detalle-periodo";
import { ListaPeriodosColumna } from "../_componentes/lista-periodos-columna";
import { SegmentoRemuneraciones, SegmentoRemuneracionesMovil } from "../_componentes/segmento-remuneraciones";

export const metadata = { title: "Remuneraciones" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Período dentro de la vista dividida; en teléfono, el detalle con «Atrás». */
export default function RemuneracionesPeriodo({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Remuneraciones"
      ruta="/remuneraciones"
      completo
      cargando="detalle"
      volverSoloTelefono
      volverBajoLg
      cargar={async () => {
        const [{ id }, p, r, perm] = await Promise.all([
          params,
          leerParametros(searchParams),
          cargarPeriodos(),
          permisosNomina(),
        ]);
        const periodos = r.ok ? r.data : [];
        const periodo = periodos.find((x) => x.id === id) ?? null;
        return { id, p, r, perm, periodos, periodo };
      }}
      opciones={(d) => ({
        insignia: <SegmentoRemuneraciones activa="periodos" />,
        volver: { href: conBusqueda("/remuneraciones", d.p.q), etiqueta: "Remuneraciones" },
        ...(d.perm.periodos && d.r.ok
          ? { acciones: <AbrirPeriodo sugerido={mesSugerido(d.periodos)} /> }
          : {}),
        ...(d.periodo?.etiqueta ? { titulo: d.periodo.etiqueta } : {}),
      })}
    >
      {(d) => (
        <>
          <SegmentoRemuneracionesMovil activa="periodos" />
          <SplitScreen
            telefono="detalle"
            unPanelHastaLg
            etiquetaLista="Lista de períodos"
            lista={
              d.r.ok ? (
                <ListaPeriodosColumna
                  state={estadoPantalla(d.r)}
                  periodos={d.periodos}
                  seleccionado={d.id}
                  {...(d.p.q ? { q: d.p.q } : {})}
                />
              ) : null
            }
            detalle={
              <Suspense fallback={<Loading variante="detalle" />}>
                <DetallePeriodo
                  periodo={d.periodo}
                  state={estadoPantalla(d.r)}
                  gestiona={d.perm.periodos}
                  puedePagar={d.perm.pagar}
                  puedeVerNovedades={d.perm.novedadesRead}
                />
              </Suspense>
            }
          />
        </>
      )}
    </PaginaPortal>
  );
}
