"use client";

import { useState } from "react";

import { Alerta, Button, Campo, Input } from "@opai/ds";

import { encolarHecho } from "@/lib/terreno/cola";

type Gravedad = "baja" | "media" | "alta";
const GRAVEDADES: readonly { v: Gravedad; t: string }[] = [
  { v: "baja", t: "Baja" },
  { v: "media", t: "Media" },
  { v: "alta", t: "Alta" },
];

/**
 * Reporta una novedad o incidente de la ronda (CAR-78 · E5a). Va a la cola con su clave: sin señal queda en el
 * teléfono y se envía después; solo se dice «guardada» cuando la cola la releyó. La gravedad alta es incidente.
 */
export function ReportarNovedad({
  personaId,
  ejecucionClave,
}: {
  personaId: string;
  ejecucionClave?: string;
}) {
  const [resumen, setResumen] = useState("");
  const [gravedad, setGravedad] = useState<Gravedad>("media");
  const [estado, setEstado] = useState<"libre" | "guardando" | "guardada" | "error">("libre");
  const enviar = async () => {
    const r = resumen.trim();
    if (r.length < 3) return;
    setEstado("guardando");
    try {
      await encolarHecho({
        tipo: "rondas.novedad",
        payload: { resumen: r, gravedad, ...(ejecucionClave ? { ejecucionClave } : {}) },
        personaId,
      });
      setResumen("");
      setEstado("guardada");
    } catch {
      setEstado("error");
    }
  };
  return (
    <section aria-label="Reportar novedad" className="flex flex-col gap-2">
      <h2 className="t-heading text-fg">Reportar novedad</h2>
      <Campo etiqueta="¿Qué pasó?" htmlFor="n-resumen">
        <Input
          id="n-resumen"
          value={resumen}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => {
            setResumen(e.target.value);
            setEstado("libre");
          }}
        />
      </Campo>
      <div role="group" aria-label="Gravedad" className="flex gap-2">
        {GRAVEDADES.map((g) => (
          <Button
            key={g.v}
            variant={gravedad === g.v ? "primary" : "secondary"}
            aria-pressed={gravedad === g.v}
            onClick={() => setGravedad(g.v)}
          >
            {g.t}
          </Button>
        ))}
      </div>
      <Button
        onClick={() => void enviar()}
        disabled={resumen.trim().length < 3 || estado === "guardando"}
      >
        {estado === "guardando" ? "Guardando…" : "Enviar novedad"}
      </Button>
      {estado === "guardada" ? (
        <Alerta tono="success" titulo="Novedad guardada">
          Quedó en el teléfono y se envía sola cuando haya señal.
        </Alerta>
      ) : null}
      {estado === "error" ? (
        <Alerta tono="danger" titulo="No se pudo guardar la novedad">
          No quedó en el teléfono. Vuelve a intentarlo.
        </Alerta>
      ) : null}
    </section>
  );
}
