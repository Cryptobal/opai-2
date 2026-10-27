"use client";

import { Banda } from "@opai/ds";

/** Banda de instalar. Se carga aparte (next/dynamic) para no pesar en el primer JS de las rutas de
 *  terreno (R6, ADR-037). En iOS va sin acción (solo instrucciones). */
export function BandaInstalar({
  mensaje,
  onInstalar,
  onCerrar,
}: {
  mensaje: string;
  onInstalar?: () => void;
  onCerrar: () => void;
}) {
  return (
    <Banda
      mensaje={mensaje}
      {...(onInstalar ? { accion: { etiqueta: "Instalar", onClick: onInstalar } } : {})}
      onCerrar={onCerrar}
    />
  );
}
