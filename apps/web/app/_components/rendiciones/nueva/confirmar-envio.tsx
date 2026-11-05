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
  ocupado,
  error,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onConfirmar: () => void;
  aprobador: string;
  total: number;
  ocupado: boolean;
  error: string | null;
}) {
  return (
    <Dialog
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="¿Enviar a aprobación?"
      descripcion={`Se la enviarás a ${aprobador} por ${pesos(total)}. Después no podrás editarla, salvo que te la devuelvan.`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={ocupado}>
            Volver
          </Button>
          <Button onClick={onConfirmar} disabled={ocupado}>
            {ocupado ? "Enviando…" : "Enviar a aprobación"}
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="text-base font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
