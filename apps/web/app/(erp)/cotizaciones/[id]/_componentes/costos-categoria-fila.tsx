"use client";

import { Button, Campo, InputMonto, Select } from "@opai/ds";

import { etiquetaCategoria } from "@/lib/cpq-presentacion";

export const GLOBAL = "__global";

/** Costo en edición: `monto` son solo dígitos; `alcance` es `GLOBAL` o el id de un puesto. */
export type FilaCosto = { clave: string; categoria: string; alcance: string; monto: string };
export type PuestoOpcion = { id: string; nombre: string };

export function FilaCostoCategoria({
  fila,
  categorias,
  puestos,
  duplicada,
  onCambiar,
  onQuitar,
}: {
  fila: FilaCosto;
  categorias: { id: string; nombre: string }[];
  puestos: PuestoOpcion[];
  duplicada: boolean;
  onCambiar: (cambio: Partial<FilaCosto>) => void;
  onQuitar: () => void;
}) {
  const k = fila.clave;
  return (
    <li className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Categoría" htmlFor={`cc-cat-${k}`}>
          <Select
            id={`cc-cat-${k}`}
            valor={fila.categoria}
            onCambiar={(categoria) => onCambiar({ categoria })}
            opciones={categorias.map((c) => ({ valor: c.id, etiqueta: etiquetaCategoria(c.id) }))}
            invalido={duplicada}
          />
        </Campo>
        <Campo etiqueta="Se asigna a" htmlFor={`cc-alc-${k}`}>
          <Select
            id={`cc-alc-${k}`}
            valor={fila.alcance}
            onCambiar={(alcance) => onCambiar({ alcance })}
            opciones={[
              { valor: GLOBAL, etiqueta: "Toda la cotización" },
              ...puestos.map((p) => ({ valor: p.id, etiqueta: `Puesto · ${p.nombre}` })),
            ]}
            invalido={duplicada}
          />
        </Campo>
      </div>
      <Campo
        etiqueta="Costo mensual (CLP)"
        htmlFor={`cc-monto-${k}`}
        {...(duplicada ? { error: "Ya hay un costo de esta categoría para el mismo alcance." } : {})}
      >
        <InputMonto id={`cc-monto-${k}`} valor={fila.monto} onCambiar={(monto) => onCambiar({ monto })} placeholder="0" />
      </Campo>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={onQuitar}>
          Quitar
        </Button>
      </div>
    </li>
  );
}
