"use client";

import { useState } from "react";

import { Button } from "@opai/ds";

import { DialogoRechazarAprobacion } from "./dialogo-rechazar-aprobacion";

type Ejecutar = (id: string, input: unknown) => Promise<unknown | null>;

/** Aprobar o rechazar el margen desde la ficha (separado de `acciones-cotizacion` por tamaño). */
export function AccionesAprobacionMargen({
  cotizacionId,
  visible,
  puedeDecidir,
  motivoBloqueo,
  pendiente,
  error,
  ocultarEnTelefono,
  ejecutar,
  limpiarError,
  onHecho,
}: {
  cotizacionId: string;
  visible: boolean;
  puedeDecidir: boolean;
  motivoBloqueo: string | null;
  pendiente: boolean;
  error: string | null;
  ocultarEnTelefono: boolean;
  ejecutar: Ejecutar;
  limpiarError: () => void;
  onHecho: () => void;
}) {
  const [rechazoAbierto, setRechazoAbierto] = useState(false);
  const clase = ocultarEnTelefono ? "hidden md:inline-flex" : undefined;
  return (
    <>
      {visible ? (
        <>
          <Button
            type="button"
            disabled={pendiente || !puedeDecidir}
            title={!puedeDecidir ? (motivoBloqueo ?? undefined) : undefined}
            className={clase}
            onClick={() => {
              limpiarError();
              void ejecutar("cpq.cotizaciones.aprobar", { id: cotizacionId }).then(
                (r) => r != null && onHecho(),
              );
            }}
          >
            Aprobar margen
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pendiente || !puedeDecidir}
            className={clase}
            onClick={() => setRechazoAbierto(true)}
          >
            Rechazar
          </Button>
        </>
      ) : null}
      <DialogoRechazarAprobacion
        abierto={rechazoAbierto}
        pendiente={pendiente}
        error={error}
        onCerrar={() => setRechazoAbierto(false)}
        onConfirmar={(motivo) => {
          limpiarError();
          void ejecutar("cpq.cotizaciones.rechazar_aprobacion", { id: cotizacionId, motivo }).then(
            (r) => {
              if (r != null) {
                setRechazoAbierto(false);
                onHecho();
              }
            },
          );
        }}
      />
    </>
  );
}
