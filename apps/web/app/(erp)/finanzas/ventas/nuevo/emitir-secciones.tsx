"use client";

import { Button, Card, Dialog } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";

import type { Venta } from "../_componentes/tipos";

type Props = {
  dialogo: "borrador" | "emitir" | null;
  setDialogo: (v: "borrador" | "emitir" | null) => void;
  previewBorrador: Venta | null;
  previewEmitir: Venta | null;
  guardarBorrador: () => void;
  emitir: () => void;
};

export function EmitirDialogos({
  dialogo,
  setDialogo,
  previewBorrador,
  previewEmitir,
  guardarBorrador,
  emitir,
}: Props) {
  return (
    <>
      <Dialog
        abierto={dialogo === "borrador" && Boolean(previewBorrador)}
        onCerrar={() => setDialogo(null)}
        titulo="Vista previa del borrador"
        descripcion="Dry-run: no se guardó nada. Confirme para crear el borrador."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setDialogo(null)}>
              Cerrar
            </Button>
            <Button onClick={() => void guardarBorrador()}>Confirmar borrador</Button>
          </>
        }
      >
        {previewBorrador ? (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-fg-muted">Total</dt>
              <dd className="t-numeric font-medium">{pesos(previewBorrador.montoTotal)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Vencimiento</dt>
              <dd>{previewBorrador.fechaVencimiento ?? "—"}</dd>
            </div>
          </dl>
        ) : null}
      </Dialog>
      <Dialog
        abierto={dialogo === "emitir" && Boolean(previewEmitir)}
        onCerrar={() => setDialogo(null)}
        titulo="Vista previa de emisión"
        descripcion="Dry-run: reserva folio simulado y firma ficticia."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setDialogo(null)}>
              Cerrar
            </Button>
            <Button onClick={() => void emitir()}>Confirmar emisión</Button>
          </>
        }
      >
        {previewEmitir ? (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-fg-muted">Folio (simulado)</dt>
              <dd className="font-mono">{previewEmitir.folio ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Total</dt>
              <dd className="t-numeric font-medium">{pesos(previewEmitir.montoTotal)}</dd>
            </div>
          </dl>
        ) : null}
      </Dialog>
    </>
  );
}

export function BloqueEmisionGuardada({
  pendiente,
  revisarEmision,
  emitir,
}: {
  pendiente: boolean;
  revisarEmision: () => void;
  emitir: () => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="t-label text-fg">Emisión al SII</h2>
      <p className="text-sm text-fg-muted">
        Borrador guardado. Revisa la emisión antes de asignar folio y firmar. Si la pide un agente, queda en{" "}
        <LinkNext href="/configuracion/aprobaciones" className="underline">
          aprobaciones pendientes
        </LinkNext>
        .
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={pendiente} onClick={() => void revisarEmision()}>
          Revisar emisión
        </Button>
        <Button disabled={pendiente} onClick={() => void emitir()}>
          Emitir factura
        </Button>
      </div>
    </Card>
  );
}
