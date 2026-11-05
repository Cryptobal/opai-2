"use client";

import { Button, Dialog } from "@opai/ds";

import { pesos } from "../formato";

/** Confirmación antes de enviar: quién aprueba y el total, para que nadie envíe a ciegas. */
export function ConfirmarEnvio({
  abierto,
  onCerrar,
  onConfirmar,
  aprobador,
  total,
  gastos,
  ocupado,
  error,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
  aprobador: string;
  total: number;
  gastos: number;
  ocupado: boolean;
  error: string | null;
}) {
  return (
    <Dialog
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="¿Enviar a aprobación?"
      descripcion="Después de enviar no podrás editarla, salvo que te la devuelvan."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={ocupado}>
            Seguir editando
          </Button>
          <Button onClick={onConfirmar} disabled={ocupado}>
            {ocupado ? "Enviando…" : "Confirmar y enviar"}
          </Button>
        </>
      }
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-base">
        <dt className="text-fg-muted">Aprobador</dt>
        <dd className="text-right font-medium">{aprobador}</dd>
        <dt className="text-fg-muted">Total</dt>
        <dd className="text-right font-medium tabular-nums">{pesos(total)}</dd>
        <dt className="text-fg-muted">Gastos</dt>
        <dd className="text-right font-medium">{gastos}</dd>
      </dl>
      {error ? (
        <p role="alert" className="text-base font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
