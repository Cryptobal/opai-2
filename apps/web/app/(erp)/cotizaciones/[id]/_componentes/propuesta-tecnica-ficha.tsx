"use client";

import { useEffect, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { DialogoPdfPropuesta } from "../propuesta-tecnica/_componentes/dialogo-pdf-propuesta";
import { PropuestaTecnicaInline, type PropuestaInline } from "./propuesta-tecnica-inline";
import { urlDePdf } from "./use-vista-previa-pdf";

export function PropuestaTecnicaFicha({
  cotizacionId,
  codigo,
  gestionar,
}: {
  cotizacionId: string;
  codigo: string;
  gestionar: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [propuesta, setPropuesta] = useState<PropuestaInline | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [version, setVersion] = useState(0);
  const propuestaId = propuesta?.id ?? null;
  const [pdf, setPdf] = useState<{ url: string; borrador: boolean } | null>(null);
  const [fallo, setFallo] = useState(false);

  /** Vista previa en un panel sobre la misma cotización: sin salir de la pantalla (CAR-215). */
  async function vistaPrevia() {
    if (!propuestaId) return;
    setFallo(false);
    const r = await ejecutar<{ pdfBase64: string; borrador: boolean }>("cpq.propuestas_tecnica.preview_pdf", {
      id: propuestaId,
      cotizacionId,
    });
    if (r) setPdf({ url: urlDePdf(r.pdfBase64), borrador: r.borrador });
    else setFallo(true);
  }

  useEffect(() => {
    void ejecutar("cpq.propuestas_tecnica.get", { cotizacionId }).then((r) => {
      if (r && typeof r === "object" && "id" in r) setPropuesta(r as PropuestaInline);
    });
  }, [cotizacionId, ejecutar, version]);

  /** «Armar propuesta técnica»: crea el armador si falta y lo muestra aquí mismo, sin salir (CAR-229). */
  async function armar() {
    if (abierta) return setAbierta(false);
    if (!propuesta) {
      const creada = await ejecutar("cpq.propuestas_tecnica.inicializar", { cotizacionId }, false);
      if (!creada || typeof creada !== "object" || !("id" in creada)) return;
      setPropuesta(creada as PropuestaInline);
    }
    setAbierta(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {gestionar || propuesta ? (
          <Button type="button" variant="secondary" cargando={pendiente && !propuesta} onClick={() => void armar()}>
            {abierta ? "Ocultar propuesta técnica" : gestionar ? "Armar propuesta técnica" : "Ver propuesta técnica"}
          </Button>
        ) : null}
        {propuestaId ? (
          <Button type="button" variant="secondary" cargando={pendiente} onClick={() => void vistaPrevia()}>
            Vista previa de la propuesta
          </Button>
        ) : null}
      </div>
      {abierta && propuesta ? (
        <PropuestaTecnicaInline
          key={version}
          cotizacionId={cotizacionId}
          codigo={codigo}
          propuesta={propuesta}
          gestionar={gestionar}
          onCambio={() => setVersion((n) => n + 1)}
        />
      ) : null}
      {fallo && error ? (
        <Alerta tono="danger" titulo="No se pudo generar la vista previa">
          {error}
        </Alerta>
      ) : null}
      {pdf ? (
        <DialogoPdfPropuesta
          codigo={codigo}
          pdfUrl={pdf.url}
          borrador={pdf.borrador}
          onCerrar={() => setPdf(null)}
        />
      ) : null}
    </div>
  );
}
