import { BarraProgreso, SeccionTarjeta } from "@opai/ds";

import type { Tablero } from "./datos";

/** Cumplimiento del tiempo objetivo de primera respuesta a solicitudes (CAR-299). */
export function PrimeraRespuesta({ r }: { r: NonNullable<Tablero["primeraRespuesta"]> }) {
  const horas = r.objetivoHoras === 1 ? "1 hora hábil" : `${r.objetivoHoras} horas hábiles`;
  return (
    <SeccionTarjeta
      titulo="Primera respuesta a solicitudes"
      accion={<span className="t-caption">Objetivo: {horas}</span>}
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-between gap-x-2">
          <span className="t-body-sm font-medium">Atendidas a tiempo</span>
          <span className="t-body-sm t-numeric">
            {r.cumplimientoPct === null ? "Sin atendidas aún" : `${r.cumplimientoPct} % · ${r.aTiempo} de ${r.atendidas}`}
          </span>
        </div>
        <BarraProgreso
          valor={(r.cumplimientoPct ?? 0) / 100}
          tono="neutro"
          etiqueta={`${r.aTiempo} de ${r.atendidas} solicitudes se atendieron dentro del plazo`}
        />
        <p className="t-caption t-numeric">
          Esperando respuesta: {r.pendientesDentro} en plazo · {r.pendientesFuera} fuera de plazo
        </p>
      </div>
    </SeccionTarjeta>
  );
}
