"use client";

import { Campo, Checkbox, Input } from "@opai/ds";

/** Controles del proveedor simulado (pruebas y QA): elige el «rostro» que ve la cámara y simula una foto. */
export function ControlesSimulado({
  token, onToken, foto, onFoto,
}: { token: string; onToken: (v: string) => void; foto: boolean; onFoto: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border-control p-3">
      <span className="t-caption text-fg-muted">Proveedor simulado (solo pruebas): elige el rostro que «ve» la cámara.</span>
      <Campo etiqueta="Rostro de prueba" htmlFor="rostro-prueba">
        <Input id="rostro-prueba" value={token} onChange={(e) => onToken(e.target.value.replace(/[^\p{L}\p{N}_-]/gu, ""))} maxLength={40} />
      </Campo>
      <Checkbox marcado={foto} onCambiar={onFoto} etiqueta="Simular una foto (sin prueba de vida)" />
    </div>
  );
}
