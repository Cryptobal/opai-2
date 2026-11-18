"use client";

import { Alerta, Button } from "@opai/ds";

const TITULO_SERVIDOR =
  "No pudimos completar la acción. Reintenta; si sigue igual, avisa a un administrador.";

/** Alerta de error de una hoja del flujo, con «Reintentar» si el fallo fue del servidor. */
export function AlertaErrorAccion({
  error,
  errorServidor,
  onReintentar,
}: {
  error: string | null;
  errorServidor: boolean;
  onReintentar: () => void;
}) {
  if (!error) return null;
  return (
    <Alerta tono="danger" titulo={errorServidor ? TITULO_SERVIDOR : error}>
      {errorServidor ? (
        <Button variant="secondary" className="mt-2" onClick={onReintentar}>
          Reintentar
        </Button>
      ) : null}
    </Alerta>
  );
}
