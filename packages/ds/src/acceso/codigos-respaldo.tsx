"use client";

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

import { cn } from "../cn";
import { Button } from "../components/button";

/**
 * Códigos de respaldo de un solo uso. Se muestran una sola vez al enrolar el segundo factor y son el
 * único camino de recuperación si se pierde el autenticador, así que se pueden copiar todos y descargar
 * como `.txt` antes de seguir. Monoespaciados para leerlos y copiarlos sin confusión.
 */
export function CodigosRespaldo({ codigos, className }: { codigos: string[]; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  const texto = codigos.join("\n");
  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  function descargar() {
    const url = URL.createObjectURL(new Blob([`${texto}\n`], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "opai-codigos-respaldo.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ul className="grid grid-cols-2 gap-2 rounded-md bg-fill p-3">
        {codigos.map((c) => (
          <li key={c} className="text-center font-mono text-sm tracking-wide text-fg">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button variant="secondary" size="md" block type="button" onClick={() => void copiar()}>
          {copiado ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copiado ? "Copiados" : "Copiar todos"}
        </Button>
        <Button variant="secondary" size="md" block type="button" onClick={descargar}>
          <Download className="size-4" aria-hidden />
          Descargar .txt
        </Button>
      </div>
    </div>
  );
}
