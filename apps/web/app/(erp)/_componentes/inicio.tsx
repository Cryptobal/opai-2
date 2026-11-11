import { Suspense } from "react";

import { AccesosInicio } from "./accesos-inicio";
import { ActividadInicio } from "./actividad-inicio";
import { CrearInicio } from "./crear-inicio";
import { DecisionInicio } from "./decision-inicio";
import { EncabezadoInicio } from "./encabezado-inicio";
import { EsqueletoIndicadores, EsqueletoTarjeta } from "./esqueletos-inicio";
import { IndicadoresInicio } from "./indicadores-inicio";
import { rejillaInicio } from "./rejilla-inicio";
import { SeguimientosInicio } from "./seguimientos-inicio";
import { TareasInicio } from "./tareas-inicio";

type Props = { nombre: string; empresa: string; actor: string | undefined; hilo?: boolean };

/**
 * Inicio del ERP (CAR-182, láminas 01 a 07): saludo con «Crear», lo que requiere decisión, tus tareas,
 * indicadores que llevan a su lista, seguimientos, tus accesos y actividad. Cada bloque carga por
 * separado (Suspense con su esqueleto) y un bloque sin permiso o sin datos no aparece (`empty:hidden`).
 * Teléfono: una columna en ese orden. 1024: decisión y tareas a la izquierda; accesos y seguimientos a la
 * derecha; actividad al final. 1280: columna lateral de 380 px con accesos y actividad. La Bandeja no
 * se repite aquí: vive en `/bandeja`. En el marco Hilo (ADR-090) el saludo y lo que requiere decisión
 * ya están en el hilo, así que no se repiten.
 */
export function InicioErp({ nombre, empresa, actor, hilo = false }: Props) {
  const r = rejillaInicio(hilo);
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoInicio
        nombre={nombre}
        empresa={empresa}
        ahora={new Date()}
        hilo={hilo}
        crear={<CrearInicio />}
      />
      <div className={r.rejilla}>
        <div className={r.indicadores}>
          <Suspense fallback={<EsqueletoIndicadores />}>
            <IndicadoresInicio />
          </Suspense>
        </div>
        <div className={r.decision}>
          {/* En el marco Hilo los pendientes están en el hilo: el bloque se oculta con CSS (ver rejilla). */}
          <Suspense fallback={<EsqueletoTarjeta />}>
            <DecisionInicio />
          </Suspense>
        </div>
        <div className={r.tareas}>
          <Suspense fallback={<EsqueletoTarjeta />}>
            <TareasInicio />
          </Suspense>
        </div>
        <div className={r.accesos}>
          <AccesosInicio />
        </div>
        <div className={r.seguimientos}>
          <Suspense fallback={<EsqueletoTarjeta filas={2} />}>
            <SeguimientosInicio />
          </Suspense>
        </div>
        <div className={r.actividad}>
          <Suspense fallback={<EsqueletoTarjeta filas={4} />}>
            <ActividadInicio actor={actor} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
