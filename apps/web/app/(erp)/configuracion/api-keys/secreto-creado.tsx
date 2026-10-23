"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button, Dialog } from "@opai/ds";

/** Muestra el secreto UNA vez, con copiar y cómo conectar el MCP. */
export function SecretoCreado({
  secreto,
  onCerrar,
}: {
  secreto: string | null;
  onCerrar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  // Solo con el diálogo abierto (nunca en el render del servidor): evita desajustes de hidratación.
  const origen = secreto && typeof window !== "undefined" ? window.location.origin : "";

  async function copiar() {
    if (!secreto) return;
    await navigator.clipboard.writeText(secreto);
    setCopiado(true);
  }

  const cerrar = () => {
    setCopiado(false);
    onCerrar();
  };

  return (
    <Dialog
      abierto={secreto !== null}
      onCerrar={cerrar}
      titulo="Copia tu API key ahora"
      descripcion="No la volveremos a mostrar. Si la pierdes, revócala y crea otra."
      acciones={
        <>
          <Button variant="secondary" onClick={copiar}>
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "Copiada" : "Copiar"}
          </Button>
          <Button onClick={cerrar}>Listo</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="t-mono rounded-md border border-border bg-bg p-3 text-sm break-all text-fg">
          {secreto}
        </p>
        <div className="text-sm text-fg-muted">
          <p className="font-medium text-fg">Conectar por MCP</p>
          <p className="mt-1">
            URL <span className="t-mono text-fg">{origen}/api/mcp</span> con la cabecera{" "}
            <span className="t-mono text-fg">Authorization: Bearer &lt;key&gt;</span> (recomendado).
          </p>
          <p className="mt-1">
            Para clientes sin cabeceras:{" "}
            <span className="t-mono text-fg">{origen}/api/mcp/k/&lt;key&gt;</span>. Menos segura (la
            key queda en la URL): úsala solo si no hay alternativa.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
