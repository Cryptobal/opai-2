import { Button, Dialog, Textarea } from "@opai/ds";

import type { AccionBulk } from "./bulk-bandeja";

export function DialogoBulkBandeja({
  accion,
  preview,
  motivo,
  ocupado,
  onMotivo,
  onCerrar,
  onConfirmar,
}: {
  accion: AccionBulk | null;
  preview: string | null;
  motivo: string;
  ocupado: boolean;
  onMotivo: (v: string) => void;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Dialog
      abierto={accion !== null}
      onCerrar={onCerrar}
      titulo={accion === "aprobar" ? "¿Aprobar las seleccionadas?" : "¿Rechazar las seleccionadas?"}
      descripcion={preview ?? ""}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={ocupado}>
            Volver
          </Button>
          <Button onClick={onConfirmar} disabled={ocupado}>
            {ocupado ? "Guardando…" : "Confirmar"}
          </Button>
        </>
      }
    >
      {accion === "rechazar" ? (
        <Textarea className="md:hidden" value={motivo} maxLength={500} onChange={(e) => onMotivo(e.target.value)} />
      ) : null}
    </Dialog>
  );
}