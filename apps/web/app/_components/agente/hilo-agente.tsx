"use client";

import { BurbujaMensaje } from "./burbuja-mensaje";
import type { Mensaje } from "./tipos";

/** Pedido del turno: el mensaje «yo» inmediatamente anterior. */
function pedidoDe(mensajes: Mensaje[], indice: number): string {
  for (let i = indice - 1; i >= 0; i--) {
    if (mensajes[i]?.rol === "yo") return mensajes[i]!.texto;
  }
  return "";
}

/** Burbujas del hilo: la persona a la derecha; el agente, con su plan y sus errores, a todo el ancho. */
export function HiloAgente({
  mensajes,
  onDecidir,
}: {
  mensajes: Mensaje[];
  onDecidir: (id: string, aceptar: boolean) => void;
}) {
  return (
    <>
      {mensajes.map((m, i) => (
        <BurbujaMensaje key={m.id} m={m} pedido={pedidoDe(mensajes, i)} onDecidir={onDecidir} />
      ))}
    </>
  );
}