"use client";

import { Button } from "@opai/ds";

/** Imprime la invitación o la guarda en PDF desde el diálogo del navegador (para enviarla o llevarla). */
export function Imprimir() {
  return (
    <Button variant="secondary" className="print:hidden" onClick={() => window.print()}>
      Imprimir o guardar en PDF
    </Button>
  );
}
