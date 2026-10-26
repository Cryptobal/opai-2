"use client";

import { Banda } from "@opai/ds";

/** Banda «Hay una versión nueva». Se carga aparte (next/dynamic) para no pesar en el primer JS de
 *  cada ruta: solo aparece cuando hay un service worker en espera (R6, ADR-037). */
export function BandaNueva({
  onActualizar,
  onCerrar,
}: {
  onActualizar: () => void;
  onCerrar: () => void;
}) {
  return (
    <Banda
      mensaje="Hay una versión nueva."
      accion={{ etiqueta: "Actualizar", onClick: onActualizar }}
      onCerrar={onCerrar}
    />
  );
}
