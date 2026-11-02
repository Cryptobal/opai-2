import { CalendarRange } from "lucide-react";

import { SplitScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";

import { AbrirPeriodo } from "./_componentes/abrir-periodo";
import { cargarPeriodos, mesSugerido, permisosNomina } from "./_componentes/datos";
import { ListaPeriodosColumna } from "./_componentes/lista-periodos-columna";
import { SegmentoRemuneraciones, SegmentoRemuneracionesMovil } from "./_componentes/segmento-remuneraciones";

export const metadata = { title: "Remuneraciones" };

/** Períodos de remuneraciones (01): lista con ficha a la derecha; lista en teléfono. */
export default function Remuneraciones({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Remuneraciones"
      ruta="/remuneraciones"
      completo
      cargar={async () => {
        const [p, r, perm] = await Promise.all([
          leerParametros(searchParams),
          cargarPeriodos(),
          permisosNomina(),
        ]);
        return { p, r, perm };
      }}
      opciones={(d) =>
        d.perm.periodos && d.r.ok
          ? {
              insignia: <SegmentoRemuneraciones activa="periodos" />,
              acciones: <AbrirPeriodo sugerido={mesSugerido(d.r.data)} />,
            }
          : { insignia: <SegmentoRemuneraciones activa="periodos" /> }
      }
    >
      {(d) => (
        <>
          <SegmentoRemuneracionesMovil activa="periodos" />
          <SplitScreen
            telefono="lista"
            unPanelHastaLg
            etiquetaLista="Lista de períodos"
            vacio={{ texto: "Elige un período", icono: CalendarRange }}
            lista={
              d.r.ok ? (
                <ListaPeriodosColumna
                  state={estadoPantalla(d.r)}
                  periodos={d.r.data}
                  {...(d.p.q ? { q: d.p.q } : {})}
                />
              ) : null
            }
          />
        </>
      )}
    </PaginaPortal>
  );
}
