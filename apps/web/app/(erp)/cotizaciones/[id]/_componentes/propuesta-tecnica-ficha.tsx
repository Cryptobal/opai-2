"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { DialogoPdfPropuesta } from "../propuesta-tecnica/_componentes/dialogo-pdf-propuesta";
import { urlDePdf } from "./use-vista-previa-pdf";

const EnvioPropuestaCotizacion = dynamic(
  () => import("./envio-propuesta-cotizacion").then((m) => m.EnvioPropuestaCotizacion),
  { ssr: false, loading: () => <p className="t-caption text-fg-muted">Cargando envío…</p> },
);

export function PropuestaTecnicaFicha({
  cotizacionId,
  codigo,
  cuentaId,
  gestionar,
  aprobarEnvios,
  puedeEnviar,
}: {
  cotizacionId: string;
  codigo: string;
  cuentaId: string | null;
  gestionar: boolean;
  aprobarEnvios: boolean;
  puedeEnviar: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [propuestaId, setPropuestaId] = useState<string | null>(null);
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
      if (r && typeof r === "object" && "id" in r) setPropuestaId(String((r as { id: string }).id));
    });
  }, [cotizacionId, ejecutar]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {gestionar ? (
          <LinkNext href={`/cotizaciones/${cotizacionId}/propuesta-tecnica`} className="inline-flex">
            <Button type="button" variant="secondary">
              Armar propuesta técnica
            </Button>
          </LinkNext>
        ) : null}
        {propuestaId ? (
          <Button type="button" variant="secondary" cargando={pendiente} onClick={() => void vistaPrevia()}>
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
      <EnvioPropuestaCotizacion
        cotizacionId={cotizacionId}
        cuentaId={cuentaId}
        propuestaId={propuestaId}
        gestionar={gestionar}
        aprobarEnvios={aprobarEnvios}
        puedeEnviar={puedeEnviar}
      />
    </div>
  );
}
