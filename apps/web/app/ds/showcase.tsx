"use client";

import { useState } from "react";

import { Button, type EstadoPantalla } from "@opai/ds";

import { BloqueComponentes } from "./bloque-componentes";
import { BloqueNuevos } from "./componentes-nuevos/bloque";
import { MuestraPwa } from "./componentes-nuevos/pwa";
import { MuestraNavegacion } from "./componentes-nuevos/navegacion";
import { BloqueDetalle } from "./bloque-detalle";
import { BloqueLista } from "./bloque-lista";
import { Bloque, BloqueFormulario, BloquePlanillaYDashboard } from "./bloques";

const ESTADOS: EstadoPantalla[] = ["ready", "loading", "empty", "error", "forbidden"];

function alternarTema(): void {
  const html = document.documentElement;
  html.dataset["theme"] = html.dataset["theme"] === "dark" ? "light" : "dark";
}

export function DsShowcase() {
  const [state, setState] = useState<EstadoPantalla>("ready");
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface p-3">
        <Button variant="secondary" onClick={alternarTema}>
          Claro / oscuro
        </Button>
        <span className="ml-2 text-sm text-fg-muted">Estado:</span>
        {ESTADOS.map((e) => (
          <Button
            key={e}
            variant={e === state ? "primary" : "secondary"}
            onClick={() => setState(e)}
          >
            {e}
          </Button>
        ))}
      </div>
      <BloqueLista state={state} onReintentar={() => setState("ready")} />
      <BloqueDetalle state={state} />
      <BloqueFormulario state={state} />
      <BloquePlanillaYDashboard state={state} />
      <BloqueComponentes />
      <BloqueNuevos state={state} />
      <Bloque titulo="Navegación por áreas · acordeón, fijados y área principal">
        <MuestraNavegacion />
      </Bloque>
      <Bloque titulo="PWA · sin conexión, versión nueva e instalar">
        <MuestraPwa />
      </Bloque>
    </div>
  );
}
