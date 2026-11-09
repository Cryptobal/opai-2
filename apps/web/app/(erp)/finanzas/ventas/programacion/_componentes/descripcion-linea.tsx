"use client";

import { Button, Campo, Input } from "@opai/ds";

/**
 * Marcadores de `PLACEHOLDERS_GLOSA` (@opai/domain), copiados aquí para no sumar el dominio al JS del cliente
 * (presupuesto, ADR-037); `test/formato-precio.test.ts` comprueba que coinciden.
 */
export const MARCADORES_DESCRIPCION = ["periodo", "uf_valor", "uf_al_dia", "monto"] as const;

/**
 * Descripción de la línea. Al escribir «#» al final del texto se ofrecen los marcadores (un clic reemplaza el
 * «#…» por el marcador); es opcional: sin marcadores la descripción se guarda igual, y uno desconocido queda tal cual.
 */
export function DescripcionLinea({
  id,
  valor,
  onCambiar,
}: {
  id: string;
  valor: string;
  onCambiar: (v: string) => void;
}) {
  const fragmento = /#[a-z_]*$/.exec(valor)?.[0];
  return (
    <Campo etiqueta="Descripción" htmlFor={id} ayuda="Escribe # para insertar un marcador.">
      <Input id={id} value={valor} onChange={(e) => onCambiar(e.target.value)} />
      {fragmento ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {MARCADORES_DESCRIPCION.map((p) => (
            <Button
              key={p}
              variant="secondary"
              onClick={() => onCambiar(valor.slice(0, -fragmento.length) + `{{${p}}}`)}
            >{`{{${p}}}`}</Button>
          ))}
        </div>
      ) : null}
    </Campo>
  );
}
