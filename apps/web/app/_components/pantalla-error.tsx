"use client";

import { Button, ErrorState, Forbidden } from "@opai/ds";

import { DIGEST_SIN_ACCESO } from "@/lib/carga-digest";

export type PropsError = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Next 16.4: refresca los datos del servidor y reinicia el límite (con `reset` solo se re-pinta). */
  retry?: () => void;
};

/**
 * Lo que muestra el `error.tsx` de cada portal (CAR-50): dentro del shell, en español y sin detalles
 * técnicos. Una carga sin permisos (`CargaFallida` con FORBIDDEN, `lib/carga.ts`) muestra `Forbidden`;
 * cualquier otro fallo, `ErrorState` con «Reintentar».
 */
export function PantallaError({ error, reset, retry }: PropsError) {
  if (error.digest === DIGEST_SIN_ACCESO) return <Forbidden />;
  return (
    <ErrorState
      titulo="No pudimos cargar esta página"
      descripcion="Puede ser un problema momentáneo de conexión o del servicio. Inténtalo de nuevo en unos segundos."
      accion={
        <Button variant="secondary" onClick={retry ?? reset}>
          Reintentar
        </Button>
      }
    />
  );
}
