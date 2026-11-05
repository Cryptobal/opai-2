"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@opai/ds";

/** «Reintentar» de un bloque de Inicio: vuelve a pedir los datos de la página (`router.refresh`), sin
 *  salir de ella; con la petición en curso queda deshabilitado. */
export function ReintentarBloque() {
  const router = useRouter();
  const [enCurso, empezar] = useTransition();
  return (
    <Button variant="secondary" disabled={enCurso} onClick={() => empezar(() => router.refresh())}>
      Reintentar
    </Button>
  );
}
