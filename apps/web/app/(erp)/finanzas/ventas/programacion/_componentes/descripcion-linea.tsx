"use client";

import { useState } from "react";

import { Button, Campo, Input } from "@opai/ds";
import { PLACEHOLDERS_GLOSA } from "@opai/domain";

const AYUDA: Record<(typeof PLACEHOLDERS_GLOSA)[number], string> = {
  periodo: "Período facturado",
  uf_valor: "UF usada para el cálculo",
  uf_al_dia: "UF del día de emisión",
  monto: "Total del documento",
};

/** «#» (con letras opcionales) justo antes del cursor: el fragmento que se reemplaza por el marcador. */
const FRAGMENTO = /#[a-z_]*$/;

/**
 * Descripción de la línea. Al escribir «#» se ofrecen los marcadores ({{periodo}}, {{uf_valor}}, {{uf_al_dia}},
 * {{monto}}); es opcional: sin marcadores la descripción se guarda igual, y uno desconocido queda tal cual.
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
  const [cursor, setCursor] = useState(0);
  const antes = valor.slice(0, cursor);
  const fragmento = FRAGMENTO.exec(antes)?.[0] ?? null;
  const filtro = fragmento ? fragmento.slice(1) : "";
  const opciones = fragmento ? PLACEHOLDERS_GLOSA.filter((p) => p.startsWith(filtro)) : [];

  function insertar(marcador: string) {
    if (!fragmento) return;
    const inicio = cursor - fragmento.length;
    const texto = `{{${marcador}}}`;
    onCambiar(valor.slice(0, inicio) + texto + valor.slice(cursor));
    const nuevo = inicio + texto.length;
    setCursor(nuevo);
    requestAnimationFrame(() => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      el?.focus();
      el?.setSelectionRange(nuevo, nuevo);
    });
  }

  return (
    <Campo
      etiqueta="Descripción"
      htmlFor={id}
      ayuda="Escribe # para insertar un marcador (período, UF, monto). Es opcional."
    >
      <Input
        id={id}
        value={valor}
        onChange={(e) => {
          setCursor(e.target.selectionStart ?? e.target.value.length);
          onCambiar(e.target.value);
        }}
        onSelect={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
      />
      {opciones.length > 0 ? (
        <div role="listbox" aria-label="Marcadores" className="mt-2 flex flex-wrap gap-2">
          {opciones.map((p) => (
            <Button
              key={p}
              variant="secondary"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertar(p)}
            >
              {`{{${p}}}`} · {AYUDA[p]}
            </Button>
          ))}
        </div>
      ) : null}
    </Campo>
  );
}
