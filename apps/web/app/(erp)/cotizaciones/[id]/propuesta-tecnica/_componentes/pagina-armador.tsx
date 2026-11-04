"use client";

import { useEffect, useState } from "react";

import { ArrowLeft, Eye } from "lucide-react";

import { Alerta, Badge, Button, Estado } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { etiquetaBasePlantillaCpq } from "@/lib/cpq-plantilla-presentacion";

import { urlDePdf } from "../../_componentes/use-vista-previa-pdf";
import { DialogoPdfPropuesta } from "./dialogo-pdf-propuesta";

type PropuestaVista = {
  id: string;
  codigo: string;
  base: string;
  servicioDesactualizado: boolean;
  estado: string;
};

export function PaginaArmadorPropuesta({ cotizacionId }: { cotizacionId: string }) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [pdf, setPdf] = useState<{ url: string; borrador: boolean } | null>(null);
  const [previaFallida, setPrevia] = useState(false);

  async function vistaPrevia(propuestaId: string) {
    setPrevia(false);
    const r = await ejecutar<{ pdfBase64: string; borrador: boolean }>("cpq.propuestas_tecnica.preview_pdf", {
      id: propuestaId,
      cotizacionId,
    });
    if (r) setPdf({ url: urlDePdf(r.pdfBase64), borrador: r.borrador });
    else setPrevia(true);
  }
  const [propuesta, setPropuesta] = useState<PropuestaVista | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    void (async () => {
      setCargando(true);
      const leida = await ejecutar("cpq.propuestas_tecnica.get", { cotizacionId });
      if (!activo) return;
      if (leida && typeof leida === "object" && "id" in leida) {
        setPropuesta(leida as PropuestaVista);
        setCargando(false);
        return;
      }
      const creada = await ejecutar("cpq.propuestas_tecnica.inicializar", { cotizacionId }, false);
      if (!activo) return;
      if (creada && typeof creada === "object" && "id" in creada) {
        setPropuesta(creada as PropuestaVista);
      }
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [cotizacionId, ejecutar]);

  return (
    <Estado state={cargando ? "loading" : propuesta ? "ready" : "error"} variante="detalle">
      {propuesta ? (
        <div className="space-y-4 p-4">
          <p className="t-heading">Propuesta técnica · {propuesta.codigo}</p>
          <Badge tono="info">Base {etiquetaBasePlantillaCpq(propuesta.base)}</Badge>
          {propuesta.servicioDesactualizado ? (
            <p className="t-caption text-warning">La cotización cambió · actualiza la sección del servicio.</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={pendiente || propuesta.estado === "congelada"}
              onClick={() =>
                void ejecutar("cpq.propuestas_tecnica.sync_servicio", {
                  id: propuesta.id,
                  cotizacionId,
                }).then(() => window.location.reload())
              }
            >
              Actualizar desde la cotización
            </Button>
            <Button type="button" variant="secondary" disabled={pendiente} onClick={() => void vistaPrevia(propuesta.id)}>
              <Eye className="size-4" aria-hidden />
              Vista previa PDF
            </Button>
            <EnlaceBoton href={`/cotizaciones/${cotizacionId}`} variante="ghost" icono={ArrowLeft}>
              Volver a la cotización
            </EnlaceBoton>
          </div>
          {previaFallida && error ? <Alerta tono="danger" titulo="No se pudo generar la vista previa">{error}</Alerta> : null}
          {pdf ? (
            <DialogoPdfPropuesta codigo={propuesta.codigo} pdfUrl={pdf.url} borrador={pdf.borrador} onCerrar={() => setPdf(null)} />
          ) : null}
        </div>
      ) : null}
    </Estado>
  );
}
