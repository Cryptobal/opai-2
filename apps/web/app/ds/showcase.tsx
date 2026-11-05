"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { Button, type EstadoPantalla } from "@opai/ds";

import { BloqueComponentes } from "./bloque-componentes";
import { MuestraAnexos } from "./componentes-nuevos/anexos";
import { BloqueNuevos } from "./componentes-nuevos/bloque";
import { MuestraCapasSueldo } from "./componentes-nuevos/capas-sueldo";
import { MuestraPanelLateral } from "./componentes-nuevos/panel-lateral";
import { BloqueDetalle } from "./bloque-detalle";
import { BloqueLista } from "./bloque-lista";
import { Bloque, BloqueFormulario, BloquePlanillaYDashboard } from "./bloques";

const ESTADOS: EstadoPantalla[] = ["ready", "loading", "empty", "error", "forbidden"];
// Demostración bajo el primer viewport: no incorpora fijados y sus controles al arranque de /ds.
const MuestraNavegacion = dynamic(() => import("./componentes-nuevos/navegacion").then((m) => m.MuestraNavegacion), { ssr: false });
const MuestraBloquePlegable = dynamic(() => import("./componentes-nuevos/bloque-plegable").then((m) => m.MuestraBloquePlegable), { ssr: false });
const MuestraMas = dynamic(() => import("./componentes-nuevos/mas").then((m) => m.MuestraMas), { ssr: false });
const MuestraPwa = dynamic(() => import("./componentes-nuevos/pwa").then((m) => m.MuestraPwa), { ssr: false });

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
      <MuestraCapasSueldo />
      <MuestraAnexos />
      <BloqueNuevos state={state} />
      <Bloque titulo="Navegación por áreas · acordeón, fijados y área principal">
        <MuestraNavegacion />
      </Bloque>
      <Bloque titulo="Menú «Más» del teléfono · variante A (CAR-182)">
        <MuestraMas />
      </Bloque>
      <Bloque titulo="Bloque plegable · ficha en pasos (CAR-192)">
        <MuestraBloquePlegable />
      </Bloque>
      <Bloque titulo="PWA · sin conexión, versión nueva e instalar">
        <MuestraPwa />
        <MuestraPanelLateral />
      </Bloque>
    </div>
  );
}
