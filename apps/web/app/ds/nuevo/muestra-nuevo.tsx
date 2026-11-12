"use client";

import { type CSSProperties, useState } from "react";

import { Button, Campo, Input } from "@opai/ds";
import { acentoDeMarca, type Modo } from "@opai/domain/marca-acento";

import { PiezasHilo } from "../hilo/piezas";

// Colores de ejemplo de empresas ficticias (datos, no estilos): los mismos seis del prototipo.
const EJEMPLOS = [
  ["Azul", "#0062d1"],
  ["Verde", "#0b7a5c"],
  ["Índigo", "#4338ca"],
  ["Magenta", "#a3195b"],
  ["Amarillo", "#ffd400"],
  ["Grafito", "#3f3f46"],
] as const;

/** Variables del acento que el marco pondrá en su raíz con el color de la empresa (bloque D2). */
function variablesDeAcento(color: string, modo: Modo): CSSProperties {
  const tono = acentoDeMarca(color)?.[modo];
  if (!tono) return {};
  const vars: Record<string, string> = {
    "--ds-accent": tono.acento,
    "--ds-accent-fg": tono.texto,
    "--ds-accent-muted": tono.suave,
    "--ds-focus": tono.acento,
  };
  return vars;
}

const Titulo = ({ children }: { children: string }) => (
  <h2 className="t-overline text-fg-muted">{children}</h2>
);

/**
 * Muestra del sistema nuevo: tipografía Geist, el color de la empresa ajustado de día y de noche, y
 * las piezas del DS con la piel nueva. Se compara con docs/2.0/design/export-diseno-nuevo/.
 */
export function MuestraNuevo() {
  const [color, setColor] = useState<string>(EJEMPLOS[0][1]);
  const [modo, setModo] = useState<Modo>("dia");
  const cambiarModo = () => {
    const siguiente: Modo = modo === "dia" ? "noche" : "dia";
    document.documentElement.dataset["theme"] = siguiente === "dia" ? "light" : "dark";
    setModo(siguiente);
  };
  const tonos = acentoDeMarca(color);
  return (
    <div
      data-marco="nuevo"
      data-testid="muestra-nuevo"
      className="min-h-dvh bg-bg text-fg"
      style={variablesDeAcento(color, modo)}
    >
      <div className="mx-auto flex max-w-[960px] flex-col gap-10 px-6 py-10">
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Sistema de diseño nuevo</h1>
            <p className="text-fg-muted">
              Blanco y negro, líneas finas y un solo color: el de la empresa (ADR-109).
            </p>
          </div>
          <Button variant="secondary" className="ml-auto" onClick={cambiarModo}>
            {modo === "dia" ? "Ver de noche" : "Ver de día"}
          </Button>
        </header>

        <section className="flex flex-col gap-3" aria-label="Color de la empresa">
          <Titulo>Color de la empresa</Titulo>
          <div className="flex flex-wrap gap-2">
            {EJEMPLOS.map(([nombre, hex]) => (
              <Button
                key={nombre}
                variant={hex === color ? "primary" : "secondary"}
                aria-pressed={hex === color}
                onClick={() => setColor(hex)}
              >
                {nombre}
              </Button>
            ))}
          </div>
          <Campo
            etiqueta="Color guardado en la marca de la empresa"
            htmlFor="nuevo-color"
            ayuda="Hexadecimal de 6 dígitos. OPAI lo ajusta si no se lee bien."
          >
            <Input
              id="nuevo-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="max-w-[200px] font-mono"
            />
          </Campo>
          <p className="font-mono text-sm text-fg-muted" data-testid="tonos-acento">
            {tonos
              ? `Día ${tonos.dia.acento} · Noche ${tonos.noche.acento}`
              : "Sin color válido: se usa el acento por defecto."}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <Titulo>Tipografía</Titulo>
          <p className="text-3xl font-semibold tracking-tight">Buenas tardes, Carlos</p>
          <p className="text-base">Geist para el texto y Geist Mono para montos, RUT y folios.</p>
          <p className="t-numeric font-mono">$ 31.750.000 · 76.543.210-K · F-000123</p>
        </section>

        <PiezasHilo />
      </div>
    </div>
  );
}
