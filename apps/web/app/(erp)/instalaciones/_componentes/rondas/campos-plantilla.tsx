"use client";

import type { Dispatch, SetStateAction } from "react";

import { Campo, Checkbox, Input, RadioGroup, Switch } from "@opai/ds";
import { ORDENES_PLANTILLA } from "@opai/domain";

import { ORDEN_PLANTILLA } from "./etiquetas";
import type { DatosPlantilla, SelPunto } from "./hoja-plantilla-datos";
import type { Punto } from "./tipos";

/** Campos de la plantilla (c13t): nombre, selección y orden de puntos, orden de recorrido y tiempos. */
export function CamposPlantilla({
  d,
  setD,
  puntos,
}: {
  d: DatosPlantilla;
  setD: Dispatch<SetStateAction<DatosPlantilla>>;
  puntos: readonly Punto[];
}) {
  const set = <K extends keyof DatosPlantilla>(k: K, v: DatosPlantilla[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const setSel = (id: string, cambio: Partial<SelPunto>) =>
    setD((x) => ({ ...x, sel: { ...x.sel, [id]: { ...x.sel[id]!, ...cambio } } }));
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Nombre de la plantilla" htmlFor="pl-nombre">
        <Input
          id="pl-nombre"
          value={d.nombre}
          placeholder="Ronda perimetral"
          onChange={(e) => set("nombre", e.target.value)}
        />
      </Campo>
      <Campo etiqueta="Puntos y orden">
        <ul className="flex flex-col rounded-md border border-border">
          {puntos.map((p) => {
            const s = d.sel[p.id]!;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                <Checkbox
                  marcado={s.incluido}
                  onCambiar={(v) => setSel(p.id, { incluido: v })}
                  etiqueta={p.nombre}
                />
                {s.incluido ? (
                  <div className="ml-auto flex items-center gap-3">
                    <label className="t-caption flex items-center gap-1">
                      Orden
                      <Input
                        compacto
                        className="w-16"
                        inputMode="numeric"
                        aria-label={`Orden de ${p.nombre}`}
                        value={s.orden}
                        onChange={(e) => setSel(p.id, { orden: e.target.value })}
                      />
                    </label>
                    <Switch
                      soloControl
                      activo={s.obligatorio}
                      onCambiar={(v) => setSel(p.id, { obligatorio: v })}
                      etiqueta={`${p.nombre} obligatorio`}
                    />
                    <span className="t-caption">{s.obligatorio ? "Obligatorio" : "Opcional"}</span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Campo>
      <RadioGroup
        etiqueta="Orden de recorrido"
        orientacion="fila"
        valor={d.ordenModo}
        onCambiar={(v) => set("ordenModo", v as DatosPlantilla["ordenModo"])}
        opciones={ORDENES_PLANTILLA.map((o) => ({ valor: o, etiqueta: ORDEN_PLANTILLA[o] }))}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Campo etiqueta="Tiempo máximo (min)" htmlFor="pl-max">
          <Input id="pl-max" inputMode="numeric" value={d.tiempoMaxMin} onChange={(e) => set("tiempoMaxMin", e.target.value)} />
        </Campo>
        <Campo etiqueta="Máximo por tramo (min)" htmlFor="pl-tramo" ayuda="En blanco: sin tope por tramo">
          <Input id="pl-tramo" inputMode="numeric" value={d.tiempoMaxTramoMin} onChange={(e) => set("tiempoMaxTramoMin", e.target.value)} />
        </Campo>
        <Campo etiqueta="Umbral incompleta (%)" htmlFor="pl-umbral">
          <Input id="pl-umbral" inputMode="numeric" value={d.umbralIncompletaPct} onChange={(e) => set("umbralIncompletaPct", e.target.value)} />
        </Campo>
      </div>
      <Switch
        activo={d.permiteAdhoc}
        onCambiar={(v) => set("permiteAdhoc", v)}
        etiqueta="Permitir rondas ad hoc"
        descripcion="El guardia puede iniciar esta ronda fuera de horario."
      />
    </div>
  );
}
