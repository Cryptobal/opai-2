"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button, Input } from "@opai/ds";

import type { OpcionCampo } from "@opai/domain";

const MAX = 50;

/**
 * Opciones de un desplegable, radio o casillas: etiqueta visible y valor interno (lo que se guarda y
 * usan los agentes; vacío = la etiqueta), en el orden en que se muestran.
 */
export function EditorOpciones(p: {
  opciones: OpcionCampo[];
  onCambiar: (o: OpcionCampo[]) => void;
}) {
  const { opciones, onCambiar } = p;
  const cambiar = (i: number, parte: Partial<OpcionCampo>) =>
    onCambiar(opciones.map((o, j) => (j === i ? { ...o, ...parte } : o)));
  const mover = (i: number, d: -1 | 1) => {
    const otra = [...opciones];
    const [o] = otra.splice(i, 1);
    if (o) otra.splice(i + d, 0, o);
    onCambiar(otra);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-md font-semibold text-fg">Opciones</legend>
      <span className="t-caption">
        Etiqueta que se ve y valor interno que se guarda (si lo dejas vacío, es la etiqueta).
      </span>
      {opciones.map((o, i) => (
        <div key={i} className="flex items-start gap-1">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <Input
              aria-label={`Etiqueta de la opción ${i + 1}`}
              maxLength={100}
              value={o.etiqueta}
              onChange={(e) => cambiar(i, { etiqueta: e.target.value })}
            />
            <Input
              aria-label={`Valor interno de la opción ${i + 1}`}
              placeholder="Valor interno"
              maxLength={100}
              value={o.valor}
              onChange={(e) => cambiar(i, { valor: e.target.value })}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Subir"
            disabled={i === 0}
            onClick={() => mover(i, -1)}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bajar"
            disabled={i === opciones.length - 1}
            onClick={() => mover(i, 1)}
          >
            <ArrowDown aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Quitar"
            onClick={() => onCambiar(opciones.filter((_, j) => j !== i))}
          >
            <X aria-hidden />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        disabled={opciones.length >= MAX}
        onClick={() => onCambiar([...opciones, { valor: "", etiqueta: "" }])}
      >
        <Plus aria-hidden /> Agregar opción
      </Button>
    </fieldset>
  );
}
