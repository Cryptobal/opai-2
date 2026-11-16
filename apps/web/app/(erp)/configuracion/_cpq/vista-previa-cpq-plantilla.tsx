"use client";

import { useEffect, useState } from "react";

import { Alerta, Badge } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { SelectorCotizacionVista } from "./selector-cotizacion-vista";
import { VistaHtmlA4 } from "./vista-html-a4";

type Vista = {
  html: string;
  marcadoresVacios: string[];
  marcadoresSinResolver: string[];
  cotizacionCodigo: string;
};

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
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cotizacion, setCotizacion] = useState<{ id: string; etiqueta: string } | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);

  useEffect(() => {
    if (!cotizacion) return setVista(null);
    let activo = true;
    void ejecutar<Vista>(
      "cpq.propuestas_html.vista_previa_cotizacion",
      {
        cotizacionId: cotizacion.id,
        ...(plantillaId ? { plantillaId } : {}),
        ...(htmlBorrador ? { html: htmlBorrador } : {}),
      },
      false,
      "ninguna",
    ).then((r) => {
      if (activo) setVista(r);
    });
    return () => {
      activo = false;
    };
  }, [cotizacion, plantillaId, htmlBorrador, ejecutar]);

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
          {(vista.marcadoresVacios.length > 0 || vista.marcadoresSinResolver.length > 0) && (
            <Alerta tono="warning" titulo="Marcadores sin dato en esta cotización">
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {vista.marcadoresSinResolver.map((m) => (
                  <li key={`r-${m}`}>
                    <Badge tono="warning">{m}</Badge> sin resolver
                  </li>
                ))}
                {vista.marcadoresVacios.map((m) => (
                  <li key={`v-${m}`}>
                    <code className="font-mono text-xs">{m}</code>
                  </li>
                ))}
              </ul>
            </Alerta>
          )}
          <VistaHtmlA4 html={vista.html} titulo={titulo} />
        </>
      ) : null}
    </div>
  );
}