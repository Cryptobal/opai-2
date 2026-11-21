"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alerta, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { DialogoPdfPropuesta } from "../propuesta-tecnica/_componentes/dialogo-pdf-propuesta";
import { urlDePdf } from "./use-vista-previa-pdf";

/**
 * En «Documento y envío», «Armar propuesta técnica» abre el diseñador de esa cotización.
 * El aspecto de los botones lo cambia CAR-544: aquí solo está el destino.
 */
export function PropuestaTecnicaFicha({
  cotizacionId,
  codigo,
  gestionar,
}: {
  cotizacionId: string;
  codigo: string;
  gestionar: boolean;
}) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [propuestaId, setPropuestaId] = useState<string | null>(null);
  const [pdf, setPdf] = useState<{ url: string; borrador: boolean } | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    void ejecutar<{ id: string } | null>("cpq.propuestas_tecnica.get", { cotizacionId }).then(
      (r) => {
        if (r && "id" in r) setPropuestaId(r.id);
      },
    );
  }, [cotizacionId, ejecutar]);

  /** El rediseño de CAR-544 mantiene esta función: solo cambia de botón a tarjeta. */
  function armar() {
    router.push(`/cotizaciones/${cotizacionId}/propuesta-tecnica`);
  }

  async function vistaPrevia() {
    if (!propuestaId) return;
    setFallo(false);
    const r = await ejecutar<{ pdfBase64: string; borrador: boolean }>(
      "cpq.propuestas_tecnica.preview_pdf",
      {
        id: propuestaId,
        cotizacionId,
      },
    );
    if (r) setPdf({ url: urlDePdf(r.pdfBase64), borrador: r.borrador });
    else setFallo(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {gestionar || propuestaId ? (
          <Button type="button" variant="secondary" onClick={() => armar()}>
            {gestionar ? "Armar propuesta técnica" : "Ver propuesta técnica"}
          </Button>
        ) : null}
        {propuestaId ? (
          <Button
            type="button"
            variant="secondary"
            cargando={pendiente}
            onClick={() => void vistaPrevia()}
          >
            Vista previa de la propuesta
          </Button>
        ) : null}
      </div>
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
