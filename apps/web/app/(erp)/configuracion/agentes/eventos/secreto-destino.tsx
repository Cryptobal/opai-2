"use client";

import { SecretoUnaVez } from "../secreto-una-vez";

/** El secreto de firma de un destino se muestra una sola vez, al crearlo o rotarlo (CAR-352). */
export function SecretoDestino({
  secreto,
  titulo,
  onCerrar,
}: {
  secreto: string | null;
  titulo: string;
  onCerrar: () => void;
}) {
  return (
    <SecretoUnaVez
      secreto={secreto}
      titulo={titulo}
      pie="Tu sistema lo usa para comprobar la firma de cada envío (cabecera OPAI-Signature)."
      etiquetaCopiar="Copiar"
      etiquetaCopiado="Copiado"
      onCerrar={onCerrar}
    />
  );
}
