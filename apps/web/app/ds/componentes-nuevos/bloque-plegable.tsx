"use client";

import { BloquePlegable, Button } from "@opai/ds";

/** Caso de `BloquePlegable` en /ds (CAR-192): pendientes, completo y abierto. */
export function MuestraBloquePlegable() {
  return (
    <div className="space-y-3 max-w-xl">
      <BloquePlegable paso={1} titulo="Cliente e instalación" resumen="Condominio Los Alerces">
        <p className="t-body text-fg-muted">Av. Apoquindo 4500, Las Condes.</p>
      </BloquePlegable>
      <BloquePlegable paso={2} titulo="Puestos" resumen="2 puestos" abiertoInicial>
        <p className="t-body text-fg-muted">Portería principal · Turno 4x4 · 08:00 a 20:00.</p>
        <Button variant="ghost" className="mt-2">Agregar puesto</Button>
      </BloquePlegable>
      <BloquePlegable paso={3} titulo="Costos y margen" pendientes={1}>
        <p className="t-body text-fg-muted">Falta definir el margen objetivo.</p>
      </BloquePlegable>
      <BloquePlegable paso={4} titulo="Documento y envío" bloqueado="Después del paso 3" abiertoInicial>
        <p className="t-body text-fg-muted">Vista previa del PDF, enlace y envío.</p>
      </BloquePlegable>
    </div>
  );
}
