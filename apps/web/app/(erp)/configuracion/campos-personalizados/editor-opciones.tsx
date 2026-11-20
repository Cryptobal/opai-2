"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button, Input } from "@opai/ds";

import type { OpcionCampo } from "@opai/domain";

const MAX = 50;

function FilaOpcion(p: {
  i: number;
  o: OpcionCampo;
  ultima: boolean;
  onCambiar: (parte: Partial<OpcionCampo>) => void;
  onMover: (d: -1 | 1) => void;
  onQuitar: () => void;
}) {
  const acciones = [
    { etiqueta: "Subir", Icono: ArrowUp, off: p.i === 0, accion: () => p.onMover(-1) },
    { etiqueta: "Bajar", Icono: ArrowDown, off: p.ultima, accion: () => p.onMover(1) },
    { etiqueta: "Quitar", Icono: X, off: false, accion: p.onQuitar },
  ];
  return (
    <div className="flex items-start gap-1">
      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <Input
          aria-label={`Etiqueta de la opción ${p.i + 1}`}
          maxLength={100}
          value={p.o.etiqueta}
          onChange={(e) => p.onCambiar({ etiqueta: e.target.value })}
        />
        <Input
          aria-label={`Valor interno de la opción ${p.i + 1}`}
          placeholder="Valor interno"
          maxLength={100}
          value={p.o.valor}
          onChange={(e) => p.onCambiar({ valor: e.target.value })}
        />
      </div>
      {acciones.map(({ etiqueta, Icono, off, accion }) => (
        <Button
          key={etiqueta}
          variant="ghost"
          size="icon"
          aria-label={etiqueta}
          disabled={off}
          onClick={accion}
        >
          <Icono aria-hidden />
        </Button>
      ))}
    </div>
  );
}

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
        <FilaOpcion
          key={i}
          i={i}
          o={o}
          ultima={i === opciones.length - 1}
          onCambiar={(parte) => cambiar(i, parte)}
          onMover={(d) => mover(i, d)}
          onQuitar={() => onCambiar(opciones.filter((_, j) => j !== i))}
        />
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
