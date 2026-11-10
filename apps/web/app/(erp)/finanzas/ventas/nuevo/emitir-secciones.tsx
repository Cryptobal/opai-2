"use client";

import { Button, Card, Dialog } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { pesos } from "@/lib/fechas";

import type { Venta } from "../_componentes/tipos";

const AMBIENTE = { certificacion: "Certificación", produccion: "Producción" } as const;

/** Texto de la vista previa: distingue el dry-run (no firma) del proveedor simulado (CAR-242). */
function textoVistaEmision(v: Venta | null) {
  const e = v?.emisionPrevista;
  if (e?.proveedor === "simpleapi") {
    return {
      descripcion: `Vista previa: aún no se firma ni se usa el folio. Al confirmar, SimpleAPI firma el DTE en ${AMBIENTE[e.ambiente].toLowerCase()}.`,
      proveedor: "SimpleAPI",
    };
  }
  return { descripcion: "Vista previa de una emisión simulada: firma ficticia, no se envía al SII.", proveedor: "Simulado (pruebas)" };
}

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
  const vista = textoVistaEmision(previewEmitir);
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
        descripcion={vista.descripcion}
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
              <dt className="text-fg-muted">Folio que se asignaría</dt>
              <dd className="font-mono">{previewEmitir.folio ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Proveedor · ambiente</dt>
              <dd>
                {vista.proveedor} · {AMBIENTE[previewEmitir.emisionPrevista?.ambiente ?? "certificacion"]}
              </dd>
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
  etiquetaEmitir = "Emitir factura",
}: {
  pendiente: boolean;
  revisarEmision: () => void;
  emitir: () => void;
  etiquetaEmitir?: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="t-label text-fg">Emisión al SII</h2>
      <p className="text-sm text-fg-muted">
        Borrador guardado. Revisa la emisión antes de asignar folio y firmar. Si la pide un agente,
        queda en{" "}
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
          {etiquetaEmitir}
        </Button>
      </div>
    </Card>
  );
}
