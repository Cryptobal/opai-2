import { ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros } from "@/lib/parametros";

import { BarraInformeRondas } from "./_componentes/barra-informe";
import { cargarInformeRondas, type FilaInformeRondas } from "./_componentes/datos";

export const metadata = { title: "Informe de rondas" };

export default function InformeRondasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Informe de rondas"
      ruta="/rondas/informe"
      completo
      cargar={async () => ({ d: await cargarInformeRondas(await leerParametros(searchParams)) })}
    >
      {({ d }) => (
        <ListScreen<FilaInformeRondas>
          state={d.state}
          titulo="Cumplimiento del mes"
          subtitulo="Misma fuente que el portal del cliente: realizadas, completas y programadas no iniciadas."
          filtros={<BarraInformeRondas anio={d.anio} mes={d.mes} filas={d.filas} />}
          items={d.filas}
          clave={(f) => f.instalacionId}
          href={(f) => `/rondas/historial?inst=${f.instalacionId}`}
          Link={LinkNext}
          tarjeta={(f) => (
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate text-base font-medium text-fg">{f.instalacion}</span>
              <span className="t-caption muted">
                {f.completadas} completas · {f.noRealizadas} no realizadas
              </span>
            </span>
          )}
          columnas={[
            { id: "instalacion", etiqueta: "Instalación", render: (f) => <span className="font-medium">{f.instalacion}</span> },
            { id: "cuenta", etiqueta: "Cuenta", render: (f) => f.cuenta },
            { id: "realizadas", etiqueta: "Realizadas", render: (f) => f.realizadas },
            { id: "completadas", etiqueta: "Completas", render: (f) => f.completadas },
            { id: "incompletas", etiqueta: "Incompletas", render: (f) => f.incompletas },
            { id: "atrasadas", etiqueta: "Atrasadas", render: (f) => f.atrasadas },
            { id: "noRealizadas", etiqueta: "No realizadas", render: (f) => f.noRealizadas },
          ]}
          textos={{
            vacio: {
              titulo: "Sin datos de rondas en este mes",
              descripcion: "Configura puntos y programaciones en la ficha de cada instalación.",
            },
          }}
        />
      )}
    </PaginaPortal>
  );
}