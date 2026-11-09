"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alerta, Badge, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { VisorPdf } from "@/app/_components/visor-pdf";
import { etiquetaBasePlantillaCpq } from "@/lib/cpq-plantilla-presentacion";

import { etiquetaBloquePropuesta } from "./etiquetas-bloque-propuesta";
import { urlDePdf } from "./use-vista-previa-pdf";

export type PropuestaInline = {
  id: string;
  base: string;
  estado: string;
  servicioDesactualizado: boolean;
  bloques: { id: string; tipo: string; titulo?: string; activo: boolean }[];
};

/**
 * Propuesta técnica completa en la misma pantalla de la cotización (CAR-229): los bloques que la
 * componen y su PDF, a todo el ancho, sin salir a otra página.
 */
export function PropuestaTecnicaInline({
  cotizacionId,
  codigo,
  propuesta,
  gestionar,
  onCambio,
}: {
  cotizacionId: string;
  codigo: string;
  propuesta: PropuestaInline;
  gestionar: boolean;
  onCambio: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [pdf, setPdf] = useState<{ url: string; borrador: boolean } | null>(null);
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);
  const url = useRef<string | null>(null);

  const liberar = useCallback(() => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  }, []);

  useEffect(() => {
    let activo = true;
    void ejecutar<{ pdfBase64: string; borrador: boolean }>(
      "cpq.propuestas_tecnica.preview_pdf",
      { id: propuesta.id, cotizacionId },
      true,
    ).then((r) => {
      if (!activo) return;
      if (!r) return setFallo(true);
      setFallo(false);
      liberar();
      url.current = urlDePdf(r.pdfBase64);
      setPdf({ url: url.current, borrador: r.borrador });
    });
    return () => {
      activo = false;
    };
  }, [cotizacionId, propuesta.id, ejecutar, liberar, intento]);

  useEffect(() => liberar, [liberar]);

  const activos = propuesta.bloques.filter((b) => b.activo);
  return (
    <section aria-label="Propuesta técnica" className="min-w-0 max-w-full space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="t-label">Propuesta técnica · {codigo}</h4>
        <Badge tono="info">Base {etiquetaBasePlantillaCpq(propuesta.base)}</Badge>
        <Badge tono={propuesta.estado === "congelada" ? "success" : "neutro"}>
          {propuesta.estado === "congelada" ? "Congelada" : "Borrador"}
        </Badge>
      </div>
      {propuesta.servicioDesactualizado ? (
        <Alerta
          tono="warning"
          titulo="La cotización cambió"
          accion={
            gestionar && propuesta.estado !== "congelada" ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                cargando={pendiente}
                onClick={() =>
                  void ejecutar("cpq.propuestas_tecnica.sync_servicio", { id: propuesta.id, cotizacionId }).then(
                    (r) => {
                      if (r) onCambio();
                    },
                  )
                }
              >
                Actualizar desde la cotización
              </Button>
            ) : undefined
          }
        >
          La sección del servicio no refleja la última versión de la cotización.
        </Alerta>
      ) : null}
      <ol className="grid min-w-0 gap-1 sm:grid-cols-2" aria-label="Bloques de la propuesta">
        {activos.map((b, i) => (
          <li key={b.id} className="t-body-sm min-w-0 truncate text-fg">
            <span className="text-fg-muted">{i + 1}.</span> {etiquetaBloquePropuesta(b.tipo, b.titulo)}
          </li>
        ))}
      </ol>
      {fallo && error ? (
        <Alerta
          tono="danger"
          titulo="No se pudo mostrar la propuesta"
          accion={
            <Button type="button" variant="secondary" size="md" onClick={() => {
                setFallo(false);
                setIntento((n) => n + 1);
              }}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alerta>
      ) : pdf ? (
        <>
          <p className="t-caption text-fg-muted">
            {pdf.borrador ? "Marca de agua BORRADOR hasta que se envíe" : "Sin marca de agua"}
          </p>
          <VisorPdf
            pdfUrl={pdf.url}
            titulo="Propuesta técnica completa"
            nombreArchivo={`${codigo}-propuesta-tecnica.pdf`}
            alto="h-[75vh]"
          />
        </>
      ) : (
        <p role="status" className="t-body-sm text-fg-muted">
          Generando propuesta…
        </p>
      )}
    </section>
  );
}
