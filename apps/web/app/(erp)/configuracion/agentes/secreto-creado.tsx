"use client";

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

export type KeyCreada = { secreto: string; nombre: string; resumen: string };

/** "Key creada" (24): el secreto se muestra una sola vez, con copiar y el resumen de la key. */
export function SecretoCreado({ k, onCerrar }: { k: KeyCreada | null; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    if (!k) return;
    await navigator.clipboard.writeText(k.secreto);
    setCopiado(true);
  }
  const cerrar = () => {
    setCopiado(false);
    onCerrar();
  };
  return (
    <Dialog
      abierto={k !== null}
      onCerrar={cerrar}
      titulo={`Key creada: ${k?.nombre ?? ""}`}
      acciones={
        <Button variant="secondary" onClick={cerrar}>
          Ya lo copié
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Alerta
          tono="warning"
          icono={AlertTriangle}
          titulo="Copia el secreto ahora. Se guarda cifrado y no se vuelve a mostrar."
        />
        <div className="flex gap-2">
          <p className="t-mono flex min-h-11 min-w-0 flex-1 items-center rounded-md border border-border bg-bg px-3 text-sm break-all text-fg">
            {k?.secreto}
          </p>
          <Button onClick={() => void copiar()}>
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "Copiada" : "Copiar"}
          </Button>
        </div>
        <p className="t-caption">{k?.resumen}</p>
      </div>
    </Dialog>
  );
}
