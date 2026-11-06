"use client";

import { useState } from "react";

import { TecladoPin } from "@opai/ds";

/** Casos de `TecladoPin` en /ds (CAR-78 · B1): vacío, a medias, completo y con error. */
export function MuestraTecladoPin() {
  const [valor, setValor] = useState("48");
  return (
    <div className="grid gap-8 md:grid-cols-3">
      <TecladoPin valor={valor} onCambiar={setValor} etiqueta="PIN de ejemplo" />
      <TecladoPin valor="482915" onCambiar={() => undefined} etiqueta="PIN completo" disabled />
      <TecladoPin valor="48" onCambiar={() => undefined} etiqueta="PIN incorrecto" error />
    </div>
  );
}
