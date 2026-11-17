"use client";

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

/** Secreto mostrado una sola vez (API key o destino de eventos): copiar y aviso. */
export function SecretoUnaVez({
  secreto,
  titulo,
  pie,
  etiquetaCopiar,
  etiquetaCopiado,
  onCerrar,
}: {
  secreto: string | null;
  titulo: string;
  pie: string;
  etiquetaCopiar: string;
  etiquetaCopiado: string;
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
            {copiado ? etiquetaCopiado : etiquetaCopiar}
          </Button>
        </div>
        <p className="t-caption">{pie}</p>
      </div>
    </Dialog>
  );
}
