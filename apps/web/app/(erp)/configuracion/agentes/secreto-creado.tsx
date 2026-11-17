"use client";

import { SecretoUnaVez } from "./secreto-una-vez";

export type KeyCreada = { secreto: string; nombre: string; resumen: string };

/** "Key creada" (24): el secreto se muestra una sola vez, con copiar y el resumen de la key. */
export function SecretoCreado({ k, onCerrar }: { k: KeyCreada | null; onCerrar: () => void }) {
  return (
    <SecretoUnaVez
      secreto={k?.secreto ?? null}
      titulo={`Key creada: ${k?.nombre ?? ""}`}
      pie={k?.resumen ?? ""}
      etiquetaCopiar="Copiar"
      etiquetaCopiado="Copiada"
      onCerrar={onCerrar}
    />
  );
}
