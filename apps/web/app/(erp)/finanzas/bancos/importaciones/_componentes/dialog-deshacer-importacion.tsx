"use client";

import { Alerta, Button, Dialog } from "@opai/ds";

import type { VistaDeshacer } from "./tipos";

/**
 * Confirmación de «Deshacer importación» (CAR-341). Muestra lo que se borrará según la vista previa del servidor;
 * si hay movimientos conciliados no deja continuar.
 */
export function DialogDeshacerImportacion({
  vista,
  periodo,
  pendiente,
  onCerrar,
  onConfirmar,
}: {
  vista: VistaDeshacer | null;
  periodo: string;
  pendiente: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  const bloqueada = (vista?.conciliados ?? 0) > 0;
  return (
    <Dialog
      abierto={vista !== null}
      onCerrar={onCerrar}
      titulo="Deshacer importación"
      descripcion={`${vista?.nombreArchivo ?? "Cartola sin nombre"} · ${periodo}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={pendiente || bloqueada} onClick={onConfirmar}>
            Deshacer importación
          </Button>
        </>
      }
    >
      {bloqueada ? (
        <Alerta tono="danger" titulo="No se puede deshacer todavía">
          {`${vista?.conciliados} movimiento${vista?.conciliados === 1 ? "" : "s"} de esta cartola ya está${vista?.conciliados === 1 ? "" : "n"} conciliado${vista?.conciliados === 1 ? "" : "s"}. Deshaz esas conciliaciones en Movimientos y vuelve aquí.`}
        </Alerta>
      ) : (
        <div className="flex flex-col gap-2 t-body-sm">
          <p>
            Se borrarán los <strong>{vista?.movimientos ?? 0} movimientos</strong> que dejó esta importación. Después
            puedes volver a subir la misma cartola.
          </p>
          <p className="text-fg-muted">
            Esta acción no se puede revertir. Los movimientos que llegaron por el banco en línea no se tocan.
          </p>
        </div>
      )}
    </Dialog>
  );
}
