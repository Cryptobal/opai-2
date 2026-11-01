import Link from "next/link";

import { Badge, Empty } from "@opai/ds";

import { descripcionCelda } from "./celda-turno";
import { claveMes } from "./etiquetas";
import type { MesPauta } from "./tipos";

/** Lectura diaria calculada con la misma capacidad y alcance que la mensual. */
export function Diaria({ mes, fecha, sinCubrir }: { mes: MesPauta | null; fecha: string; sinCubrir: boolean }) {
  if (!mes) return <Empty titulo="Elige una instalación" descripcion="Selecciona una instalación para ver sus turnos del día." />;
  const turnos = mes.puestos.flatMap((puesto) => {
    const celda = puesto.celdas.find((c) => c.fecha === fecha);
    return celda && (celda.estado === "cubierto" || celda.estado === "ppc") ? [{ puesto, celda }] : [];
  });
  const filas = sinCubrir ? turnos.filter(({ celda }) => celda.estado === "ppc") : turnos;
  return (
    <section aria-label="Turnos del día" className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">Asistencia no activada: sin marcas para cruzar.</p>
      <p className="text-sm">{turnos.filter(({ celda }) => celda.estado === "ppc").length} sin cubrir · {turnos.length} turnos</p>
      {filas.length === 0 ? <Empty titulo="Sin turnos para mostrar" descripcion="No hay turnos que coincidan con la selección." /> : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {filas.map(({ puesto, celda }) => (
            <li key={puesto.id}>
              <Link href={`?inst=${mes.instalacionId}&vista=diaria&fecha=${fecha}&mes=${claveMes(mes.anio, mes.mes)}&dia=${puesto.id}_${fecha}`} scroll={false} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 outline-none focus-visible:outline-2 focus-visible:outline-focus">
                <span className="min-w-0"><span className="block font-medium">{puesto.nombre}</span><span className="block text-xs text-fg-muted">{puesto.horario} · {mes.personas.find((p) => p.id === celda.titularId)?.nombre ?? "Sin titular"}</span></span>
                <Badge tono={celda.estado === "ppc" ? "danger" : "success"}>{descripcionCelda(celda)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
