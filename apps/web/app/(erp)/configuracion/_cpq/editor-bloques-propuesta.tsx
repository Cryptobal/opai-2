"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState } from "react";

import { Button, Select, Switch } from "@opai/ds";

import {
  etiquetaBloquePropuesta,
  fijarBloque,
  moverBloque,
  tiposDisponibles,
  type BloquePlantilla,
} from "@/lib/cpq-bloques-propuesta";

type Props = {
  bloques: BloquePlantilla[];
  onCambiar: (bloques: BloquePlantilla[]) => void;
  /** Texto bajo la lista. En la cotización explica el documento; en Marca y plantillas, la plantilla. */
  leyenda?: string;
};

function FilaBloque({ bloques, onCambiar, i }: Props & { i: number }) {
  const b = bloques[i]!;
  const nombre = etiquetaBloquePropuesta(b.tipo, b.titulo);
  const cambiar = (x: BloquePlantilla) => onCambiar(bloques.map((y, j) => (j === i ? x : y)));
  return (
    <li
      aria-label={nombre}
      className="flex flex-col gap-1 border-b border-border px-3 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="t-mono w-6 flex-none text-fg-subtle">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span className="truncate font-medium">{nombre}</span>
      </span>
      <span className="flex items-center gap-1 pl-8 sm:pl-0">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={`Subir ${nombre}`}
          disabled={i === 0}
          onClick={() => onCambiar(moverBloque(bloques, i, -1))}
        >
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={`Bajar ${nombre}`}
          disabled={i === bloques.length - 1}
          onClick={() => onCambiar(moverBloque(bloques, i, 1))}
        >
          <ArrowDown className="size-4" aria-hidden />
        </Button>
        <Switch
          etiqueta="Fijo"
          className="gap-1"
          activo={b.fijo}
          onCambiar={(v) => cambiar(fijarBloque(b, v))}
        />
        <Switch
          etiqueta="Activo"
          className="gap-1"
          activo={b.activo}
          disabled={b.fijo}
          onCambiar={(v) => cambiar({ ...b, activo: v })}
        />
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={`Quitar ${nombre}`}
          disabled={b.fijo}
          onClick={() => onCambiar(bloques.filter((_, j) => j !== i))}
        >
          <X className="size-4" aria-hidden />
        </Button>
      </span>
    </li>
  );
}

function AgregarBloque({ bloques, onCambiar }: Props) {
  const [nuevo, setNuevo] = useState<string>();
  const disponibles = tiposDisponibles(bloques);
  if (disponibles.length === 0) return null;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-56 flex-1">
        <Select
          aria-label="Bloque para agregar"
          valor={nuevo}
          placeholder="Elige un bloque para agregar"
          onCambiar={setNuevo}
          opciones={disponibles.map((t) => ({ valor: t, etiqueta: etiquetaBloquePropuesta(t) }))}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={!nuevo}
        onClick={() => {
          if (!nuevo) return;
          onCambiar([...bloques, { tipo: nuevo, activo: true, fijo: false, opcional: true }]);
          setNuevo(undefined);
        }}
      >
        Agregar bloque
      </Button>
    </div>
  );
}

/**
 * Bloques de la propuesta del tenant: orden con «Subir/Bajar» (accesible, sin arrastre), activo,
 * fijo u opcional, quitar y agregar. Un bloque fijo queda activo y no se quita.
 */
export function EditorBloquesPropuesta(p: Props) {
  return (
    <div className="space-y-2">
      <p className="t-label-sm">Bloques de la propuesta (en orden)</p>
      <ol
        className="flex flex-col rounded-md border border-border"
        aria-label="Bloques de la propuesta"
      >
        {p.bloques.map((b, i) => (
          <FilaBloque key={`${b.tipo}-${i}`} {...p} i={i} />
        ))}
      </ol>
      <p className="t-caption text-fg-muted">
        {p.leyenda ??
          "Fijo: siempre sale y no se quita en la cotización. Activo: sale por defecto."}
      </p>
      <AgregarBloque {...p} />
    </div>
  );
}
