"use client";

import { useEffect, useState } from "react";

import { Badge, Button, Estado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { etiquetaBasePlantillaCpq } from "@/lib/cpq-plantilla-presentacion";

type PropuestaVista = {
  id: string;
  codigo: string;
  base: string;
  servicioDesactualizado: boolean;
  estado: string;
};

export function PaginaArmadorPropuesta({ cotizacionId }: { cotizacionId: string }) {
  const { ejecutar, pendiente } = useCapacidad("erp");
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
          <div className="flex flex-wrap gap-2">
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
            <Button
              type="button"
              variant="secondary"
              disabled={pendiente}
              onClick={() =>
                void ejecutar("cpq.propuestas_tecnica.preview_pdf", { id: propuesta.id, cotizacionId })
              }
            >
              Vista previa PDF
            </Button>
            <LinkNext href={`/cotizaciones/${cotizacionId}`} className="text-accent t-body-sm">
              Volver a la cotización
            </LinkNext>
          </div>
        </div>
      ) : null}
    </Estado>
  );
}
