import Link from "next/link";

import { Empty } from "@opai/ds";

import { BadgesCeldaDiaria } from "./badges-celda-pauta";
import { descripcionCelda } from "./celda-turno";
import { claveMes, personaEnTurno } from "./etiquetas";
import type { MesPauta } from "./tipos";

/** Lectura diaria calculada con la misma capacidad y alcance que la mensual. */
export function Diaria({ mes, fecha, sinCubrir }: { mes: MesPauta | null; fecha: string; sinCubrir: boolean }) {
  if (!mes)
    return (
      <Empty titulo="Elige una instalación" descripcion="Selecciona una instalación para ver sus turnos del día." />
    );
  const turnos = mes.puestos.flatMap((puesto) => {
    const celda = puesto.celdas.find((c) => c.fecha === fecha);
    return celda && celda.estado !== "libre" && celda.estado !== "sin_serie" ? [{ puesto, celda }] : [];
  });
  const filas = sinCubrir ? turnos.filter(({ celda }) => celda.estado === "ppc") : turnos;
  const ppc = turnos.filter(({ celda }) => celda.estado === "ppc").length;
  const q = (extra: string) =>
    `?inst=${mes.instalacionId}&vista=diaria&fecha=${fecha}&mes=${claveMes(mes.anio, mes.mes)}&dia=${extra}${sinCubrir ? "&ver=ppc" : ""}`;

  return (
    <section aria-label="Turnos del día" className="flex flex-col gap-3">
      {turnos.some(({ celda }) => celda.presencia) ? null : (
        <p className="text-sm text-fg-muted">Sin marcas de asistencia para cruzar.</p>
      )}
      <p className="text-sm">
        {ppc} sin cubrir · {turnos.length} turnos
      </p>
      {filas.length === 0 ? (
        <Empty titulo="Sin turnos para mostrar" descripcion="No hay turnos que coincidan con la selección." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {filas.map(({ puesto, celda }) => (
            <li key={puesto.id}>
              <Link
                href={q(`${puesto.id}_${fecha}`)}
                scroll={false}
                aria-label={`${puesto.nombre}: ${descripcionCelda(celda)}`}
                className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 outline-none focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{puesto.nombre}</span>
                  <span className="block text-xs text-fg-muted">
                    {puesto.horario} · {personaEnTurno(mes, celda.titularId, celda.cubiertoPorId)}
                  </span>
                </span>
                <BadgesCeldaDiaria celda={celda} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
