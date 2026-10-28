"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@opai/ds";

/** Patrón compartido con la creación de secretos; nunca copia texto al log. */
export function BotonCopiar({ texto, etiqueta = "Copiar" }: { texto: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false);
  const [fallo, setFallo] = useState(false);
  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setFallo(false);
            setTimeout(() => setCopiado(false), 2000);
          } catch {
            setFallo(true);
          }
        }}
      >
        {copiado ? (
          <Check className="size-4" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copiado ? "Copiado" : etiqueta}
      </Button>
      {fallo ? (
        <p role="status" className="t-caption">
          No se pudo copiar. Selecciona el texto manualmente.
        </p>
      ) : null}
    </div>
  );
}
