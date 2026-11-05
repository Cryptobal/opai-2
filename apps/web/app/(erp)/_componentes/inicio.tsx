import { Suspense } from "react";

import { diaLargo } from "@/lib/fechas";
import { nombreDePila } from "@/lib/nombre";

import { AccesosInicio } from "./accesos-inicio";
import { ActividadInicio } from "./actividad-inicio";
import { CrearInicio } from "./crear-inicio";
import { DecisionInicio } from "./decision-inicio";
import { EsqueletoIndicadores, EsqueletoTarjeta } from "./esqueletos-inicio";
import { IndicadoresInicio } from "./indicadores-inicio";
import { SeguimientosInicio } from "./seguimientos-inicio";
import { TareasInicio } from "./tareas-inicio";

function saludo(ahora: Date) {
  const h = Number(
    new Intl.DateTimeFormat("es-CL", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Santiago",
    }).format(ahora),
  );
  return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
}

type Props = { nombre: string; empresa: string; actor: string | undefined };

/**
 * Inicio del ERP (CAR-182, láminas 01 a 07): saludo con «Crear», lo que requiere decisión, tus tareas,
 * indicadores que llevan a su lista, seguimientos, tus accesos y actividad. Cada bloque carga por
 * separado (Suspense con su esqueleto) y un bloque sin permiso o sin datos no aparece (`empty:hidden`).
 * Teléfono: una columna en ese orden. 1024: decisión y tareas a la izquierda; accesos y seguimientos a la
 * derecha; actividad al final. 1280: columna lateral de 380 px con accesos y actividad. La Bandeja no
 * se repite aquí: vive en `/bandeja`.
 */
export function InicioErp({ nombre, empresa, actor }: Props) {
  const ahora = new Date();
  const pila = nombreDePila(nombre);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="t-title text-fg">
            <span className="md:hidden">Hola, {pila}</span>
            <span className="hidden md:inline">
              {saludo(ahora)}, {pila}
            </span>
          </h2>
          <p className="text-base text-fg-muted">
            {diaLargo(ahora)}
            <span className="hidden md:inline"> · {empresa}</span>
          </p>
        </div>
        <CrearInicio />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 empty:hidden max-lg:order-3 lg:col-span-2 lg:row-start-1">
          <Suspense fallback={<EsqueletoIndicadores />}>
            <IndicadoresInicio />
          </Suspense>
        </div>
        <div className="min-w-0 empty:hidden max-lg:order-1 lg:col-start-1 lg:row-start-2">
          <Suspense fallback={<EsqueletoTarjeta />}>
            <DecisionInicio />
          </Suspense>
        </div>
        <div className="min-w-0 empty:hidden max-lg:order-2 lg:col-start-1 lg:row-start-3">
          <Suspense fallback={<EsqueletoTarjeta />}>
            <TareasInicio />
          </Suspense>
        </div>
        <div className="min-w-0 empty:hidden max-lg:order-5 lg:col-start-2 lg:row-start-2">
          <AccesosInicio />
        </div>
        <div className="min-w-0 empty:hidden max-lg:order-4 lg:col-start-2 lg:row-start-3 xl:col-start-1 xl:row-start-4">
          <Suspense fallback={<EsqueletoTarjeta filas={2} />}>
            <SeguimientosInicio />
          </Suspense>
        </div>
        <div className="min-w-0 empty:hidden max-lg:order-6 lg:col-span-2 lg:row-start-4 xl:col-span-1 xl:col-start-2 xl:row-span-2 xl:row-start-3">
          <Suspense fallback={<EsqueletoTarjeta filas={4} />}>
            <ActividadInicio actor={actor} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
