"use client";

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

export type ClaveFormulario = { token: string; endpoint: string };

/** Muestra la clave del formulario web una sola vez tras rotarla (Brief 07 PR 2). */
export function ClaveFormularioCreada({
  d,
  onCerrar,
}: {
  d: ClaveFormulario | null;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
  }
  const cerrar = () => {
    setCopiado(false);
    onCerrar();
  };
  const origen = typeof window !== "undefined" ? window.location.origin : "https://test.opai.cl";
  const url = d ? `${origen}${d.endpoint}` : "";
  const curl = d
    ? `curl -sS -X POST '${url}' \\
  -H 'Authorization: Bearer ${d.token}' \\
  -H 'Content-Type: application/json' \\
  -H 'Idempotency-Key: $(uuidgen)' \\
  -d '{"mensaje":"Consulta desde gard.cl","nombre":"Ana Pérez","email":"ana@ejemplo.cl","website":""}'`
    : "";
  return (
    <Dialog
      abierto={d !== null}
      onCerrar={cerrar}
      titulo="Clave del formulario web"
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
          titulo="Copia la clave ahora. Solo se muestra una vez; en configuración verás los últimos cuatro caracteres."
        />
        <div className="flex flex-col gap-1">
          <span className="t-label-sm text-fg-muted">Clave (Bearer)</span>
          <div className="flex gap-2">
            <p className="t-mono flex min-h-11 min-w-0 flex-1 items-center rounded-md border border-border bg-bg px-3 text-sm break-all text-fg">
              {d?.token}
            </p>
            <Button onClick={() => d && void copiar(d.token)}>
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiada" : "Copiar clave"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="t-label-sm text-fg-muted">Endpoint</span>
          <p className="t-mono rounded-md border border-border bg-bg px-3 py-2 text-sm break-all">
            {url}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="t-label-sm text-fg-muted">Ejemplo curl</span>
          <pre className="t-mono max-h-48 overflow-auto rounded-md border border-border bg-bg p-3 text-xs whitespace-pre-wrap">
            {curl}
          </pre>
          <Button variant="ghost" onClick={() => d && void copiar(curl)}>
            Copiar curl
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
