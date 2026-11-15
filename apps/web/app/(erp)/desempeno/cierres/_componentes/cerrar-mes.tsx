"use client";

import { lazy, Suspense, useState } from "react";

import { Button } from "@opai/ds";

import { mesCorto } from "../../_componentes/tipos";

const Confirmar = lazy(() =>
  import("./confirmar-cierre").then((m) => ({ default: m.ConfirmarCierre })),
);

/** Botón para cerrar a mano un mes ya terminado (el anterior arriba; los más antiguos en su fila) (`desempeno.periodos.cerrar`); confirma antes. */
export function CerrarMes({ periodo, enFila = false }: { periodo: string; enFila?: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const mes = mesCorto(periodo);
  return (
    <>
      <Button
        variant={enFila ? "secondary" : "primary"}
        aria-label={`Cerrar ${mes}`}
        onClick={() => setConfirmando(true)}
      >
        {enFila ? "Cerrar" : `Cerrar ${mes}`}
      </Button>
      {confirmando ? (
        <Suspense fallback={null}>
          <Confirmar periodo={periodo} mes={mes} onCerrar={() => setConfirmando(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
