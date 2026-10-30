"use client";

import { Plus, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Button, Campo, ChipToggle, InputFecha, InputHora, Input, Select } from "@opai/ds";

import { DIAS } from "./dias";
import type { DatosProgramacion } from "./hoja-programacion-datos";
import type { Plantilla } from "./tipos";

/** Campos de la programación (c13s): plantilla, horarios fijos, días, vigencia y tolerancia. */
export function CamposProgramacion({
  d,
  setD,
  plantillas,
}: {
  d: DatosProgramacion;
  setD: Dispatch<SetStateAction<DatosProgramacion>>;
  plantillas: readonly Plantilla[];
}) {
  const set = <K extends keyof DatosProgramacion>(k: K, v: DatosProgramacion[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const setHora = (i: number, v: string) =>
    setD((x) => ({ ...x, horarios: x.horarios.map((h, j) => (j === i ? v : h)) }));
  const quitarHora = (i: number) => setD((x) => ({ ...x, horarios: x.horarios.filter((_, j) => j !== i) }));
  const alternarDia = (v: number) =>
    setD((x) => ({ ...x, dias: x.dias.includes(v) ? x.dias.filter((n) => n !== v) : [...x.dias, v] }));
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Nombre" htmlFor="pr-nombre">
        <Input id="pr-nombre" value={d.nombre} placeholder="Ronda perimetral" onChange={(e) => set("nombre", e.target.value)} />
      </Campo>
      <Campo etiqueta="Plantilla" htmlFor="pr-plantilla">
        <Select
          valor={d.plantillaId}
          onCambiar={(v) => set("plantillaId", v)}
          opciones={plantillas.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
        />
      </Campo>
      <Campo etiqueta="Horarios">
        <div className="flex flex-col gap-2">
          {d.horarios.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <InputHora valor={h} onCambiar={(v) => setHora(i, v)} />
              <Button
                variant="ghost"
                aria-label={`Quitar la hora ${h || i + 1}`}
                disabled={d.horarios.length <= 1}
                onClick={() => quitarHora(i)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => set("horarios", [...d.horarios, ""])}>
            <Plus className="size-4" aria-hidden />
            Agregar hora
          </Button>
        </div>
      </Campo>
      <Campo etiqueta="Días de la semana">
        <div className="flex flex-wrap gap-2">
          {DIAS.map((dia) => (
            <ChipToggle
              key={dia.valor}
              etiqueta={dia.corta}
              activo={d.dias.includes(dia.valor)}
              onCambiar={() => alternarDia(dia.valor)}
            />
          ))}
        </div>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Vigencia desde" htmlFor="pr-desde" ayuda="Opcional">
          <InputFecha valor={d.vigenciaDesde} onCambiar={(v) => set("vigenciaDesde", v)} />
        </Campo>
        <Campo etiqueta="Vigencia hasta" htmlFor="pr-hasta" ayuda="Opcional">
          <InputFecha valor={d.vigenciaHasta} onCambiar={(v) => set("vigenciaHasta", v)} />
        </Campo>
      </div>
      <Campo etiqueta="Tolerancia para iniciar (min)" htmlFor="pr-tol">
        <Input id="pr-tol" inputMode="numeric" value={d.toleranciaMin} onChange={(e) => set("toleranciaMin", e.target.value)} />
      </Campo>
      <p className="t-caption">
        Responsables: quien esté de turno en la instalación. La asignación nominal llega en una próxima
        entrega.
      </p>
    </div>
  );
}
