import { lazy } from "react";

/** Confirmación que se carga al abrirla: anular y responder ausencias no pesan en el primer JS de la ficha. */
export const DialogoConfirmar = lazy(() =>
  import("@/app/_components/maestros/dialogo-confirmar").then((m) => ({
    default: m.DialogoConfirmar,
  })),
);
