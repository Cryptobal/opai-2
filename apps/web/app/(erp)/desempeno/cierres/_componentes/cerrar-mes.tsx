"use client";

import { lazy, Suspense, useState } from "react";

import { Button } from "@opai/ds";

import { mesCorto } from "../../_componentes/tipos";

const Confirmar = lazy(() =>
  import("./confirmar-cierre").then((m) => ({ default: m.ConfirmarCierre })),
);

/** Botón para cerrar a mano el mes anterior (`desempeno.periodos.cerrar`); confirma antes. */
export function CerrarMes({ periodo }: { periodo: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const mes = mesCorto(periodo);
  return (
    <>
      <Button onClick={() => setConfirmando(true)}>Cerrar {mes}</Button>
      {confirmando ? (
        <Suspense fallback={null}>
          <Confirmar periodo={periodo} mes={mes} onCerrar={() => setConfirmando(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
