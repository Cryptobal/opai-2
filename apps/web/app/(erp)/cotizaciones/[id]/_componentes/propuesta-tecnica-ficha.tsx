"use client";

import { useEffect, useState } from "react";

import { Button } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { EnvioPropuestaCotizacion } from "./envio-propuesta-cotizacion";

export function PropuestaTecnicaFicha({
  cotizacionId,
  gestionar,
  aprobarEnvios,
  puedeEnviar,
}: {
  cotizacionId: string;
  gestionar: boolean;
  aprobarEnvios: boolean;
  puedeEnviar: boolean;
}) {
  const { ejecutar } = useCapacidad("erp");
  const [propuestaId, setPropuestaId] = useState<string | null>(null);

  useEffect(() => {
    void ejecutar("cpq.propuestas_tecnica.get", { cotizacionId }).then((r) => {
      if (r && typeof r === "object" && "id" in r) setPropuestaId(String((r as { id: string }).id));
    });
  }, [cotizacionId, ejecutar]);

  return (
    <div className="space-y-3">
      {gestionar ? (
        <LinkNext href={`/cotizaciones/${cotizacionId}/propuesta-tecnica`} className="inline-flex">
          <Button type="button" variant="secondary">
            Armar propuesta técnica
          </Button>
        </LinkNext>
      ) : null}
      <EnvioPropuestaCotizacion
        cotizacionId={cotizacionId}
        propuestaId={propuestaId}
        gestionar={gestionar}
        aprobarEnvios={aprobarEnvios}
        puedeEnviar={puedeEnviar}
      />
    </div>
  );
}
