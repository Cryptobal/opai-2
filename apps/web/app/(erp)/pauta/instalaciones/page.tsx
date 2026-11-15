import { ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import type { SearchParams } from "@/lib/parametros";
import { leerParametros } from "@/lib/parametros";

import { claveMes } from "../_componentes/etiquetas";
import { BarraInforme } from "./_componentes/barra-informe";
import { cargarInforme, type FilaInforme } from "./_componentes/datos";
import { Pct } from "./_componentes/valores";
import { VistasPauta } from "./_componentes/vistas";

export const metadata = { title: "Pauta por instalación" };

type Props = { searchParams: SearchParams };

function Detalle({ f, conAsistencia }: { f: FilaInforme; conAsistencia: boolean }) {
  return (
    <span className="grid grid-cols-2 gap-x-3 gap-y-0.5 t-caption">
      <span>Por cubrir: {f.ppc}</span>
      <span>Refuerzos: {f.refuerzos}</span>
      {conAsistencia ? (
        <>
          <span>
            Ausentismo: <Pct campo="ausentismo" v={f.ausentismo} />
          </span>
          <span>
            Atrasos: <Pct campo="atrasos" v={f.atrasos} />
          </span>
        </>
      ) : null}
    </span>
  );
}

/**
 * Pauta · Por instalación (CAR-330, diseño aprobado por Carlos el 12-nov-2026): compara las instalaciones
 * del mes por cobertura, turnos por cubrir, refuerzos, ausentismo y atrasos. Cada fila abre la pauta
 * mensual de esa instalación. Ausentismo y atrasos solo con Asistencia activa y permiso para verla.
 */
export default function PautaPorInstalacion({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Pauta"
      ruta="/pauta/instalaciones"
      completo
      cargar={async () => ({ d: await cargarInforme(await leerParametros(searchParams)) })}
    >
      {({ d }) => (
        <ListScreen<FilaInforme>
          state={d.state}
          titulo="Por instalación"
          subtitulo={
            d.conAsistencia ? undefined : "Ausentismo y atrasos aparecen con Asistencia activa."
          }
          filtros={
            <div className="flex w-full flex-col gap-3">
              <VistasPauta anio={d.anio} mes={d.mes} />
              <BarraInforme anio={d.anio} mes={d.mes} orden={d.orden} filas={d.filas} />
            </div>
          }
          items={d.filas}
          clave={(f) => f.instalacionId}
          href={(f) => `/pauta?inst=${f.instalacionId}&mes=${claveMes(d.anio, d.mes)}`}
          Link={LinkNext}
          tarjeta={(f) => (
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-base font-medium text-fg">{f.instalacion}</span>
                <Pct campo="cobertura" v={f.cobertura} className="text-base font-medium" />
              </span>
              <Detalle f={f} conAsistencia={d.conAsistencia} />
            </span>
          )}
          columnas={[
            {
              id: "instalacion",
              etiqueta: "Instalación",
              render: (f) => <span className="font-medium">{f.instalacion}</span>,
            },
            { id: "cuenta", etiqueta: "Cuenta", render: (f) => f.cuenta },
            {
              id: "cobertura",
              etiqueta: "Cobertura",
              render: (f) => <Pct campo="cobertura" v={f.cobertura} />,
            },
            { id: "ppc", etiqueta: "Por cubrir", render: (f) => f.ppc },
            { id: "refuerzos", etiqueta: "Refuerzos", render: (f) => f.refuerzos },
            ...(d.conAsistencia
              ? [
                  {
                    id: "ausentismo",
                    etiqueta: "Ausentismo",
                    render: (f: FilaInforme) => <Pct campo="ausentismo" v={f.ausentismo} />,
                  },
                  {
                    id: "atrasos",
                    etiqueta: "Atrasos",
                    render: (f: FilaInforme) => <Pct campo="atrasos" v={f.atrasos} />,
                  },
                ]
              : []),
          ]}
          textos={{
            vacio: {
              titulo: "Aún no hay instalaciones con pauta",
              descripcion:
                "Crea los puestos de cada instalación y fija su serie para compararlas aquí.",
            },
          }}
        />
      )}
    </PaginaPortal>
  );
}
