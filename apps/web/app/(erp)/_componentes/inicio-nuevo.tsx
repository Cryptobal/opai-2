import { Suspense } from "react";

import { TabsEstado } from "@opai/ds";

import { AccesosInicio } from "./accesos-inicio";
import { ActividadInicio } from "./actividad-inicio";
import { AgendaInicio } from "./agenda-inicio";
import { CrearInicio } from "./crear-inicio";
import { DecisionInicio } from "./decision-inicio";
import { EncabezadoInicio } from "./encabezado-inicio";
import { EsqueletoIndicadores, EsqueletoTarjeta } from "./esqueletos-inicio";
import { IndicadoresInicio } from "./indicadores-inicio";
import { SeguimientosInicio } from "./seguimientos-inicio";
import { TareasInicio } from "./tareas-inicio";

type Props = { nombre: string; empresa: string; actor: string | undefined };

/**
 * Inicio del diseño nuevo (ADR-109, CAR-335 D3; `export-diseno-nuevo`, vista Inicio): saludo con
 * «Crear», los indicadores que eligió la empresa («Personalizar») y la cola de trabajo en pestañas:
 * «Necesita tu atención» (decisiones, tus tareas de hoy y seguimientos), «Actividad» y «Agenda»
 * (próximos 14 días). Tus accesos van al lado desde 1280 px. Mismas capacidades que el Inicio clásico.
 */
export function InicioNuevo({ nombre, empresa, actor }: Props) {
  const atencion = (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<EsqueletoTarjeta />}>
        <DecisionInicio />
      </Suspense>
      <Suspense fallback={<EsqueletoTarjeta />}>
        <TareasInicio />
      </Suspense>
      <Suspense fallback={<EsqueletoTarjeta filas={2} />}>
        <SeguimientosInicio />
      </Suspense>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoInicio
        nombre={nombre}
        empresa={empresa}
        ahora={new Date()}
        hilo={false}
        crear={<CrearInicio />}
      />
      <Suspense fallback={<EsqueletoIndicadores />}>
        <IndicadoresInicio personalizar />
      </Suspense>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Tu trabajo" className="min-w-0">
          <TabsEstado
            tabs={[
              { id: "atencion", etiqueta: "Necesita tu atención", contenido: atencion },
              {
                id: "actividad",
                etiqueta: "Actividad",
                contenido: (
                  <Suspense fallback={<EsqueletoTarjeta filas={4} />}>
                    <ActividadInicio actor={actor} />
                  </Suspense>
                ),
              },
              {
                id: "agenda",
                etiqueta: "Agenda",
                contenido: (
                  <Suspense fallback={<EsqueletoTarjeta filas={3} />}>
                    <AgendaInicio />
                  </Suspense>
                ),
              },
            ]}
          />
        </section>
        <div className="min-w-0 empty:hidden">
          <AccesosInicio />
        </div>
      </div>
    </div>
  );
}
