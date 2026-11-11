"use client";

import { useState } from "react";

import { Textarea } from "../components/input";

const aTexto = (valor: unknown) => (valor == null ? "" : JSON.stringify(valor, null, 2));

/**
 * Ajuste con `control: "json"` (listas de objetos, como factores o plantillas): se edita como texto JSON. Solo avisa
 * el cambio cuando el texto es JSON válido; mientras no lo sea, lo dice y no pisa el valor guardado.
 */
export function ControlJson(p: {
  id: string;
  valor: unknown;
  disabled: boolean;
  onCambiar: (v: unknown) => void;
}) {
  const [texto, setTexto] = useState(() => aTexto(p.valor));
  const [de, setDe] = useState(p.valor);
  const [invalido, setInvalido] = useState(false);
  // El valor cambió desde fuera (guardar, descartar o restablecer): el texto vuelve a reflejarlo.
  if (p.valor !== de) {
    setDe(p.valor);
    setTexto(aTexto(p.valor));
    setInvalido(false);
  }

  function cambiar(nuevo: string) {
    setTexto(nuevo);
    if (nuevo.trim() === "") {
      setInvalido(false);
      setDe(null);
      p.onCambiar(null);
      return;
    }
    try {
      const v: unknown = JSON.parse(nuevo);
      setInvalido(false);
      setDe(v);
      p.onCambiar(v);
    } catch {
      setInvalido(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={p.id}
        value={texto}
        rows={Math.min(12, Math.max(3, texto.split("\n").length))}
        spellCheck={false}
        aria-invalid={invalido}
        disabled={p.disabled}
        onChange={(e) => cambiar(e.target.value)}
        className="font-mono text-sm"
      />
      {invalido ? (
        <p role="alert" className="text-sm text-danger-fg">
          El texto no es JSON válido todavía. Si guardas ahora, se guarda la última versión válida.
        </p>
      ) : null}
    </div>
  );
}
