"use client";

import { useState, useTransition } from "react";

import { Button } from "@opai/ds";
import type { PortalVerComo } from "@opai/domain";

import { accionIniciarVerComo } from "@/app/_acciones/ver-como";

/** Inicia la vista; si el servidor la rechaza, el motivo queda junto al botón. */
export function BotonVer({
  portal,
  objetivoId,
  nombre,
}: {
  portal: PortalVerComo;
  objetivoId: string;
  nombre: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <span className="flex flex-none flex-col items-end gap-1">
      <Button
        variant="secondary"
        aria-label={`Ver como ${nombre}`}
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const r = await accionIniciarVerComo(portal, objetivoId);
            if (r) setError(r.error);
          })
        }
      >
        {pendiente ? "Abriendo…" : "Ver"}
      </Button>
      {error ? (
        <span role="alert" className="max-w-56 text-right text-sm text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
