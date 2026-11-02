"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";

const EnvioPropuestaCotizacion = dynamic(
  () => import("./envio-propuesta-cotizacion").then((m) => m.EnvioPropuestaCotizacion),
  { ssr: false, loading: () => <p className="t-caption text-fg-muted">Cargando envío…</p> },
);

export function PropuestaTecnicaFicha({
  cotizacionId,
  cuentaId,
  gestionar,
  aprobarEnvios,
  puedeEnviar,
}: {
  cotizacionId: string;
  cuentaId: string | null;
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
        cuentaId={cuentaId}
        propuestaId={propuestaId}
        gestionar={gestionar}
        aprobarEnvios={aprobarEnvios}
        puedeEnviar={puedeEnviar}
      />
    </div>
  );
}
