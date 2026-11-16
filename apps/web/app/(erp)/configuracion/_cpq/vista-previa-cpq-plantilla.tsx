"use client";

import { useState } from "react";

import { Alerta } from "@opai/ds";

import { AlertaMarcadoresVista } from "./alerta-marcadores-vista";
import { SelectorCotizacionVista } from "./selector-cotizacion-vista";
import { useVistaPreviaCotizacion } from "./use-vista-previa-cotizacion";
import { VistaHtmlA4 } from "./vista-html-a4";

/** Renderiza la plantilla con una CPQ real: marco A4, sin marcadores crudos visibles. */
export function VistaPreviaCpqPlantilla({
  plantillaId,
  htmlBorrador,
  titulo,
}: {
  plantillaId?: string;
  htmlBorrador?: string | null;
  titulo: string;
}) {
  const [cotizacion, setCotizacion] = useState<{ id: string; etiqueta: string } | null>(null);
  const { vista, pendiente, error } = useVistaPreviaCotizacion({
    cotizacionId: cotizacion?.id ?? null,
    plantillaId,
    htmlBorrador,
  });

  return (
    <div className="flex flex-col gap-3">
      <SelectorCotizacionVista valor={cotizacion} onCambiar={setCotizacion} />
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {!cotizacion ? (
        <p className="t-caption text-fg-muted">Elige una cotización para ver la plantilla con datos reales.</p>
      ) : pendiente && !vista ? (
        <p role="status" className="t-caption text-fg-muted">
          Generando vista previa…
        </p>
      ) : null}
      {vista ? (
        <>
          <p className="t-caption text-fg-muted">
            Vista previa con la cotización <strong>{vista.cotizacionCodigo}</strong>
          </p>
          <AlertaMarcadoresVista vacios={vista.marcadoresVacios} sinResolver={vista.marcadoresSinResolver} />
          <VistaHtmlA4 html={vista.html} titulo={titulo} />
        </>
      ) : null}
    </div>
  );
}