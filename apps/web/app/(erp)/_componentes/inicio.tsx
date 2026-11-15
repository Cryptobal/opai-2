import { Suspense } from "react";

import { AccesosInicio } from "./accesos-inicio";
import { ActividadInicio } from "./actividad-inicio";
import { CrearInicio } from "./crear-inicio";
import { DecisionInicio } from "./decision-inicio";
import { EncabezadoInicio } from "./encabezado-inicio";
import { EsqueletoIndicadores, EsqueletoTarjeta } from "./esqueletos-inicio";
import { IndicadoresInicio } from "./indicadores-inicio";
import { InicioNuevo } from "./inicio-nuevo";
import { rejillaInicio } from "./rejilla-inicio";
import { SeguimientosInicio } from "./seguimientos-inicio";
import { TareasInicio } from "./tareas-inicio";

type Props = {
  nombre: string;
  empresa: string;
  actor: string | undefined;
  /** Diseño nuevo (ADR-109): cola de trabajo en pestañas e indicadores elegidos. */
  nuevo?: boolean;
};

/**
 * Inicio del ERP (CAR-182): con empresa es el diseño nuevo; sin empresa, el marco base. Cada bloque
 * carga por separado (Suspense con su esqueleto) y un bloque sin permiso o sin datos no aparece.
 */
export function InicioErp({ nombre, empresa, actor, nuevo = false }: Props) {
  if (nuevo) return <InicioNuevo nombre={nombre} empresa={empresa} actor={actor} />;
  const r = rejillaInicio;
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoInicio
        nombre={nombre}
        empresa={empresa}
        ahora={new Date()}
        crear={<CrearInicio />}
      />
      <div className={r.rejilla}>
        <div className={r.indicadores}>
          <Suspense fallback={<EsqueletoIndicadores />}>
            <IndicadoresInicio />
          </Suspense>
        </div>
        <div className={r.decision}>
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
