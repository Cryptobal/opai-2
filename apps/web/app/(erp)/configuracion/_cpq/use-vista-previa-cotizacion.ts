"use client";

import { useEffect, useMemo, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type VistaCpqPlantilla = {
  html: string;
  marcadoresVacios: string[];
  marcadoresSinResolver: string[];
  cotizacionCodigo: string;
};

export function useVistaPreviaCotizacion(input: {
  cotizacionId: string | null;
  plantillaId?: string;
  htmlBorrador?: string | null;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cache, setCache] = useState<{ cotizacionId: string; vista: VistaCpqPlantilla } | null>(null);

  useEffect(() => {
    if (!input.cotizacionId) return;
    let activo = true;
    void ejecutar<VistaCpqPlantilla>(
      "cpq.propuestas_html.vista_previa_cotizacion",
      {
        cotizacionId: input.cotizacionId,
        ...(input.plantillaId ? { plantillaId: input.plantillaId } : {}),
        ...(input.htmlBorrador ? { html: input.htmlBorrador } : {}),
      },
      false,
      "ninguna",
    ).then((r) => {
      if (activo && r) setCache({ cotizacionId: input.cotizacionId!, vista: r });
    });
    return () => {
      activo = false;
    };
  }, [input.cotizacionId, input.plantillaId, input.htmlBorrador, ejecutar]);

  const vista = useMemo(() => {
    if (!input.cotizacionId || cache?.cotizacionId !== input.cotizacionId) return null;
    return cache.vista;
  }, [input.cotizacionId, cache]);

  return {
    vista,
    pendiente: Boolean(input.cotizacionId && pendiente),
    error,
  };
}