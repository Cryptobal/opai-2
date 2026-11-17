"use client";

import { useState } from "react";

import { Alerta, Button, Campo, CodigoQr, Input, SeccionTarjeta, Textarea } from "@opai/ds";
import type { ConfigAcceso } from "@opai/domain/acceso-config";

import type { CartelPrivacidad } from "./cartel-accion";
import { cartelPrivacidad } from "./cartel-accion";
import type { Punto } from "./editor-puntos";

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
        {puntos.length ? (
          <Campo etiqueta="Punto (opcional)" htmlFor="pv-punto" ayuda="El QR incluye el punto si eliges uno.">
            <Input
              id="pv-punto"
              list="puntos-lista"
              disabled={disabled}
              placeholder="Todos los puntos"
              onChange={(e) => {
                const p = puntos.find((x) => x.nombre === e.target.value.trim());
                setPuntoId(p?.id ?? "");
              }}
            />
            <datalist id="puntos-lista">
              {puntos.map((p) => (
                <option key={p.id ?? p.nombre} value={p.nombre} />
              ))}
            </datalist>
          </Campo>
        ) : null}
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Button variant="secondary" disabled={disabled || cargando} onClick={() => void verCartel()}>
          {cargando ? "Preparando…" : "Preparar cartel"}
        </Button>
        {cartel ? (
          <article className="rounded-lg border border-border bg-bg p-4 print:border-0">
            <p className="t-caption mb-1">{cartel.empresa}</p>
            <h2 className="t-title mb-2">{cartel.instalacion}</h2>
            {cartel.punto ? <p className="t-body mb-2">{cartel.punto}</p> : null}
            <p className="t-body mb-4 whitespace-pre-wrap">{cartel.aviso}</p>
            <CodigoQr svg={cartel.qrSvg} alt="QR a la política de privacidad" className="mx-auto" />
            <p className="t-caption mt-2 break-all text-center text-fg-muted">{cartel.urlPolitica}</p>
            <Button className="mt-4 print:hidden" onClick={() => window.print()}>
              Imprimir o guardar PDF
            </Button>
          </article>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}