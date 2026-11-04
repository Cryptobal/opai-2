"use client";

import { Alerta, Button, Segmentado } from "@opai/ds";

import { useVistaPreviaPdf } from "./use-vista-previa-pdf";

/** Vista previa del PDF dentro de la hoja de envío, con los adjuntos que saldrán (cotización y, si existe, propuesta técnica). */
export function EnviarVistaPrevia({
  cotizacionId,
  conPropuesta,
  hayPropuesta,
  onConPropuesta,
}: {
  cotizacionId: string;
  conPropuesta: boolean;
  hayPropuesta: boolean;
  onConPropuesta: (v: boolean) => void;
}) {
  const { estado, mensaje, reintentar } = useVistaPreviaPdf(cotizacionId);
  return (
    <section aria-labelledby="cpq-env-previa" className="space-y-3">
      <h3 id="cpq-env-previa" className="t-label">
        Vista previa
      </h3>
      {mensaje ? (
        <Alerta
          tono="danger"
          titulo="No se pudo mostrar la vista previa"
          accion={
            <Button type="button" variant="secondary" size="md" onClick={reintentar}>
              Reintentar
            </Button>
          }
        >
          {mensaje}
        </Alerta>
      ) : estado.fase === "listo" ? (
        <iframe title="Vista previa del PDF" src={estado.pdfUrl} className="h-72 w-full rounded-md border border-border" />
      ) : (
        <p role="status" className="t-body-sm text-fg-muted">
          Generando PDF…
        </p>
      )}
      <Segmentado
        etiqueta="Adjuntos del envío"
        activa={conPropuesta && hayPropuesta ? "con" : "solo"}
        opciones={[
          { id: "solo", etiqueta: "Cotización", onClick: () => onConPropuesta(false) },
          ...(hayPropuesta ? [{ id: "con", etiqueta: "+ propuesta técnica", onClick: () => onConPropuesta(true) }] : []),
        ]}
      />
      {!hayPropuesta ? <p className="t-caption text-fg-muted">La propuesta técnica se arma aparte y se puede adjuntar cuando exista.</p> : null}
    </section>
  );
}
