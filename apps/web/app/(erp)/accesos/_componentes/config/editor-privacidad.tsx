"use client";

import { useState } from "react";

import { Alerta, Button, Campo, SeccionTarjeta, Textarea } from "@opai/ds";
import type { ConfigAcceso } from "@opai/domain/acceso-config";

import type { CartelPrivacidad } from "./cartel-accion";
import { cartelPrivacidad } from "./cartel-accion";
import type { Punto } from "./editor-puntos";
import { SelectorPuntoPrivacidad } from "./selector-punto-privacidad";
import { VistaCartelPrivacidad } from "./vista-cartel-privacidad";

export function EditorPrivacidad({
  instalacionId,
  config,
  onCambiar,
  disabled,
  puntos,
}: {
  instalacionId: string;
  config: ConfigAcceso;
  onCambiar: (c: Partial<ConfigAcceso>) => void;
  disabled: boolean;
  puntos: Punto[];
}) {
  const [cartel, setCartel] = useState<CartelPrivacidad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [puntoId, setPuntoId] = useState("");
  async function verCartel() {
    setCargando(true);
    setError(null);
    const r = await cartelPrivacidad(instalacionId, puntoId || undefined);
    setCargando(false);
    if (!r.ok) return setError(r.error);
    setCartel(r.data);
  }
  return (
    <SeccionTarjeta titulo="Aviso de privacidad">
      <div className="flex flex-col gap-3 px-4 pb-4">
        <Campo etiqueta="Texto del cartel" htmlFor="pv-texto">
          <Textarea
            id="pv-texto"
            value={config.avisoPrivacidad}
            disabled={disabled}
            rows={4}
            maxLength={400}
            onChange={(e) => onCambiar({ avisoPrivacidad: e.target.value })}
          />
        </Campo>
        <SelectorPuntoPrivacidad puntos={puntos} disabled={disabled} onElegir={setPuntoId} />
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Button variant="secondary" disabled={disabled || cargando} onClick={() => void verCartel()}>
          {cargando ? "Preparando…" : "Preparar cartel"}
        </Button>
        {cartel ? <VistaCartelPrivacidad cartel={cartel} /> : null}
      </div>
    </SeccionTarjeta>
  );
}