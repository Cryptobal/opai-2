"use client";

import { useEffect, useState } from "react";

import { Estado } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CuerpoDisenador, type Propuesta } from "./cuerpo-disenador";

/**
 * Diseñador de la propuesta de esta cotización: bloques, textos con IA y el documento con la
 * plantilla HTML en uso (o el formato con la marca, si no hay plantilla).
 */
export function DisenadorPropuesta(p: {
  cotizacionId: string;
  negocioId: string;
  codigo: string;
  gestionar: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    void abrir(ejecutar, p.cotizacionId, p.gestionar).then((r) => {
      if (!activo) return;
      setPropuesta(r);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [ejecutar, p.cotizacionId, p.gestionar]);

  return (
    <Estado state={cargando ? "loading" : propuesta ? "ready" : "error"} variante="detalle">
      {propuesta ? (
        <CuerpoDisenador
          {...p}
          propuesta={propuesta}
          pendiente={pendiente}
          error={error}
          ejecutar={ejecutar}
          onPropuesta={setPropuesta}
        />
      ) : null}
    </Estado>
  );
}

async function abrir(
  ejecutar: ReturnType<typeof useCapacidad>["ejecutar"],
  cotizacionId: string,
  gestionar: boolean,
): Promise<Propuesta | null> {
  const leida = await ejecutar<Propuesta | null>(
    "cpq.propuestas_tecnica.get",
    { cotizacionId },
    false,
    "ninguna",
  );
  if (leida) return leida;
  if (!gestionar) return null;
  return ejecutar<Propuesta>(
    "cpq.propuestas_tecnica.inicializar",
    { cotizacionId },
    false,
    "ninguna",
    crypto.randomUUID(),
  );
}
