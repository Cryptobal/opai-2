"use client";

import { useState } from "react";

import { Button, Enlace } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/**
 * Novedades del producto sin leer dentro de la Bandeja (CAR-316): avisa cuántas hay, lleva a
 * Novedades y permite marcarlas todas como leídas. Al marcar, emite `opai-novedades` para que el
 * número de la Bandeja y el del menú de cuenta bajen juntos. Sin novedades pendientes, no aparece.
 */
export function NovedadesBandeja({ noLeidas }: { noLeidas: number }) {
  const [marcando, setMarcando] = useState(false);
  const [error, setError] = useState(false);
  if (noLeidas <= 0) return null;
  const marcar = () => {
    setMarcando(true);
    setError(false);
    // Un corte de red o un despliegue nuevo rechaza la acción: el botón vuelve y se avisa.
    void ejecutarCapacidad("erp", "core.novedades.marcar_todas", {})
      .then((r) => {
        if (!r.ok) {
          setError(true);
          return;
        }
        window.dispatchEvent(new Event("opai-novedades"));
      })
      .catch(() => setError(true))
      .finally(() => setMarcando(false));
  };
  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-accent bg-accent-muted px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="t-label text-fg">
          {noLeidas === 1 ? "1 novedad de OPAI sin leer" : `${noLeidas} novedades de OPAI sin leer`}
        </p>
        <p className="t-body-sm text-fg-muted">
          {error ? "No pudimos marcarlas como leídas. Intenta de nuevo." : "Cambios recientes en las pantallas que usas."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Enlace href="/novedades">Ver novedades</Enlace>
        <Button variant="ghost" className="h-11 md:h-9" disabled={marcando} onClick={marcar}>
          Marcar novedades como leídas
        </Button>
      </div>
    </div>
  );
}
