"use client";

import { Trash2 } from "lucide-react";

import { Button, Campo, Input, Select } from "@opai/ds";

import type { IndicadorOpcion, ItemScorecard } from "../../../_componentes/tipos";

type Props = {
  items: ItemScorecard[];
  opciones: IndicadorOpcion[];
  onCambiar: (items: ItemScorecard[]) => void;
};

const MAXIMO = 12;
const ETIQUETA_UNIDAD: Record<string, string> = {
  porcentaje: "%",
  clp: "$",
  uf: "UF",
  horas: "horas",
  dias: "días",
};

/** Filas editables del scorecard: indicador, meta del mes y peso; al pie, agregar otro indicador. */
export function FilasScorecard({ items, opciones, onCambiar }: Props) {
  const porId = new Map(opciones.map((o) => [o.id, o]));
  const libres = opciones.filter((o) => !items.some((i) => i.indicador === o.id));
  const cambiar = (indicador: string, cambio: Partial<ItemScorecard>) =>
    onCambiar(items.map((i) => (i.indicador === indicador ? { ...i, ...cambio } : i)));

  return (
    <div className="flex flex-col gap-4">
      {items.map((i, n) => {
        const def = porId.get(i.indicador);
        const unidad = def ? ETIQUETA_UNIDAD[def.unidad] : undefined;
        return (
          <div
            key={i.indicador}
            className="flex flex-col gap-2 rounded-lg border border-border p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-base font-medium text-fg">{def?.nombre ?? i.indicador}</span>
                {def ? <span className="t-caption">{def.descripcion}</span> : null}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${def?.nombre ?? "indicador"}`}
                onClick={() => onCambiar(items.filter((x) => x.indicador !== i.indicador))}
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                etiqueta={unidad ? `Meta del mes (${unidad})` : "Meta del mes"}
                htmlFor={`sc-meta-${n}`}
              >
                <Input
                  id={`sc-meta-${n}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={Number.isFinite(i.meta) ? i.meta : ""}
                  onChange={(e) => cambiar(i.indicador, { meta: e.target.valueAsNumber })}
                />
              </Campo>
              <Campo etiqueta="Peso (%)" htmlFor={`sc-peso-${n}`}>
                <Input
                  id={`sc-peso-${n}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  step={1}
                  value={Number.isFinite(i.peso) ? i.peso : ""}
                  onChange={(e) => cambiar(i.indicador, { peso: e.target.valueAsNumber })}
                />
              </Campo>
            </div>
          </div>
        );
      })}
      {items.length < MAXIMO && libres.length > 0 ? (
        <Campo etiqueta="Agregar indicador" htmlFor="sc-agregar">
          <Select
            id="sc-agregar"
            valor=""
            placeholder="Elige un indicador"
            opciones={libres.map((o) => ({
              valor: o.id,
              etiqueta: o.nombre,
              descripcion: o.descripcion,
            }))}
            onCambiar={(id) => {
              const def = porId.get(id);
              if (def) onCambiar([...items, { indicador: id, meta: def.metaSugerida, peso: 10 }]);
            }}
          />
        </Campo>
      ) : null}
      {opciones.length === 0 ? (
        <p className="t-body-sm text-fg-muted">No hay indicadores disponibles para esta empresa.</p>
      ) : null}
    </div>
  );
}
