"use client";

import { useState } from "react";

import { Button, PanelLateral } from "@opai/ds";

/** PanelLateral (agente, CAR-120): teléfono a pantalla completa, iPad superpuesto, ≥1280 px acoplado. */
export function MuestraPanelLateral() {
  const [abierto, setAbierto] = useState(false);
  const [retener, setRetener] = useState(false);
  return (
    <section aria-label="Panel lateral" className="flex flex-col gap-3">
      <h3 className="t-label-sm text-fg">Panel lateral</h3>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setAbierto(true)}>
          Abrir panel
        </Button>
        <Button
          variant={retener ? "primary" : "secondary"}
          aria-pressed={retener}
          onClick={() => setRetener((r) => !r)}
        >
          Retener (plan pendiente)
        </Button>
      </div>
      <PanelLateral
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Panel de ejemplo"
        retener={retener}
        acciones={
          <Button variant="ghost" onClick={() => setRetener(false)}>
            Soltar
          </Button>
        }
      >
        <p className="t-body p-4 text-fg-muted">
          Con «Retener» activo, Escape y el clic fuera no lo cierran; «Cerrar» siempre funciona.
        </p>
      </PanelLateral>
    </section>
  );
}
