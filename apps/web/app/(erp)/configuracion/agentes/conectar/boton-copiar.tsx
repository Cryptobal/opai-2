"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@opai/ds";

/** Copia un texto al portapapeles y confirma con "Copiado" durante 2 s. */
export function BotonCopiar({ texto, etiqueta = "Copiar" }: { texto: string; etiqueta?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
    >
      {copiado ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copiado ? "Copiado" : etiqueta}
    </Button>
  );
}
