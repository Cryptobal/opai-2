"use client";

import { Button, Input, Select, Switch } from "@opai/ds";

import type { PasoCadena } from "./tipos-cadena";
import { CANALES_OPCIONES, codificarDestinatario, decodificarDestinatario } from "./cadena-opciones";

type Props = {
  paso: PasoCadena;
  indice: number;
  total: number;
  pendiente: boolean;
  opcionesDest: { valor: string; etiqueta: string }[];
  onCambiar: (paso: PasoCadena) => void;
  onMover: (delta: number) => void;
};

export function FilaPasoCadena({ paso, indice, total, pendiente, opcionesDest, onCambiar, onMover }: Props) {
  return (
    <li className="flex flex-col gap-2 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-label w-6">{indice + 1}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="iconSm" disabled={pendiente || indice === 0} onClick={() => onMover(-1)} aria-label="Subir">
            ↑
          </Button>
          <Button variant="ghost" size="iconSm" disabled={pendiente || indice >= total - 1} onClick={() => onMover(1)} aria-label="Bajar">
            ↓
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <Select
            valor={codificarDestinatario(paso.destinatario)}
            opciones={opcionesDest}
            onCambiar={(v) => onCambiar({ ...paso, destinatario: decodificarDestinatario(v) })}
          />
        </div>
        <Switch soloControl etiqueta={`Paso ${indice + 1} activo`} activo={paso.activo} onCambiar={(activo) => onCambiar({ ...paso, activo })} />
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-8">
        <label className="t-caption text-fg-muted">Espera (min)</label>
        <Input
          type="number"
          min={1}
          max={240}
          className="w-24"
          value={String(paso.esperaMin)}
          onChange={(e) => onCambiar({ ...paso, esperaMin: Number(e.target.value) || 1 })}
        />
        <Select
          valor={paso.canales[0] ?? "campana"}
          opciones={CANALES_OPCIONES}
          onCambiar={(canal) => onCambiar({ ...paso, canales: [canal as PasoCadena["canales"][0]] })}
        />
        <Switch
          soloControl
          etiqueta="Exige «me hago cargo»"
          activo={paso.exigeConfirmacion}
          onCambiar={(exigeConfirmacion) => onCambiar({ ...paso, exigeConfirmacion })}
        />
      </div>
    </li>
  );
}