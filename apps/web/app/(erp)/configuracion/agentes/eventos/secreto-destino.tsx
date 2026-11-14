"use client";

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

/** El secreto de firma de un destino se muestra una sola vez, al crearlo o rotarlo (CAR-352). */
export function SecretoDestino({
  secreto,
  titulo,
  onCerrar,
}: {
  secreto: string | null;
  titulo: string;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const cerrar = () => {
    setCopiado(false);
    onCerrar();
  };
  return (
    <Dialog
      abierto={secreto !== null}
      onCerrar={cerrar}
      titulo={titulo}
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
            {secreto}
          </p>
          <Button
            onClick={async () => {
              if (!secreto) return;
              await navigator.clipboard.writeText(secreto);
              setCopiado(true);
            }}
          >
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="t-caption">
          Tu sistema lo usa para comprobar la firma de cada envío (cabecera OPAI-Signature).
        </p>
      </div>
    </Dialog>
  );
}
