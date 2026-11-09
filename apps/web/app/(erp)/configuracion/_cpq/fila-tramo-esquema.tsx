"use client";

import { Alerta, Button, Campo, ChipToggle, Input, Select, SelectorHora } from "@opai/ds";

import { cruzaMedianoche, type ErroresTramo, type TramoBorrador } from "@/lib/esquema-borrador";

import { type CicloTurno, DIAS_SEMANA } from "./esquemas-tipos";

/** Un tramo del esquema: nombre, ciclo, horario, días y puestos, con sus errores en línea. */
export function FilaTramoEsquema({
  tramo,
  ciclos,
  errores,
  puedeQuitar,
  onCambiar,
  onQuitar,
}: {
  tramo: TramoBorrador;
  ciclos: readonly CicloTurno[];
  errores: ErroresTramo | undefined;
  puedeQuitar: boolean;
  onCambiar: (cambio: Partial<TramoBorrador>) => void;
  onQuitar: () => void;
}) {
  const id = `tramo-${tramo.clave}`;
  const alternarDia = (d: number) =>
    onCambiar({ diasSemana: tramo.diasSemana.includes(d) ? tramo.diasSemana.filter((x) => x !== d) : [...tramo.diasSemana, d].sort() });
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Campo etiqueta="Nombre del tramo" htmlFor={`${id}-n`} {...(errores?.nombre ? { error: errores.nombre } : {})}>
            <Input id={`${id}-n`} value={tramo.nombre} aria-invalid={Boolean(errores?.nombre) || undefined} onChange={(e) => onCambiar({ nombre: e.target.value })} />
          </Campo>
        </div>
        {puedeQuitar ? <Button type="button" variant="ghost" onClick={onQuitar}>Quitar</Button> : null}
      </div>
      <Campo etiqueta="Ciclo de turno" htmlFor={`${id}-c`} {...(errores?.patronId ? { error: errores.patronId } : {})}>
        <Select
          id={`${id}-c`}
          valor={tramo.patronId || undefined}
          placeholder="Elige un ciclo"
          invalido={Boolean(errores?.patronId)}
          opciones={ciclos.map((c) => ({ valor: c.id, etiqueta: c.nombre, descripcion: c.resumen }))}
          onCambiar={(v) => onCambiar({ patronId: v })}
        />
      </Campo>
      <div className="grid grid-cols-3 gap-3">
        <Campo etiqueta="Desde" htmlFor={`${id}-i`}>
          <SelectorHora id={`${id}-i`} valor={tramo.horaInicio} onCambiar={(v) => onCambiar({ horaInicio: v })} />
        </Campo>
        <Campo etiqueta="Hasta" htmlFor={`${id}-f`}>
          <SelectorHora id={`${id}-f`} valor={tramo.horaFin} onCambiar={(v) => onCambiar({ horaFin: v })} />
        </Campo>
        <Campo etiqueta="Puestos" htmlFor={`${id}-p`} {...(errores?.posiciones ? { error: errores.posiciones } : {})}>
          <Input
            id={`${id}-p`}
            type="number"
            inputMode="numeric"
            min={1}
            value={Number.isNaN(tramo.posiciones) ? "" : tramo.posiciones}
            aria-invalid={Boolean(errores?.posiciones) || undefined}
            onChange={(e) => onCambiar({ posiciones: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
          />
        </Campo>
      </div>
      {cruzaMedianoche(tramo.horaInicio, tramo.horaFin) ? <p className="t-caption text-fg-muted">Cruza la medianoche.</p> : null}
      {errores?.horario ? <p role="alert" className="t-caption text-danger-fg">{errores.horario}</p> : null}
      <div className="space-y-1">
        <span className="t-label-sm">Días de la semana</span>
        <div className="flex flex-wrap gap-2">
          {DIAS_SEMANA.map((d, i) => (
            <ChipToggle key={d} etiqueta={d} activo={tramo.diasSemana.includes(i + 1)} onCambiar={() => alternarDia(i + 1)} />
          ))}
        </div>
        {errores?.dias ? <Alerta tono="danger" titulo={errores.dias} /> : null}
      </div>
    </fieldset>
  );
}
