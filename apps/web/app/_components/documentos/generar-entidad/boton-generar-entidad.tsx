"use client";

import Link from "next/link";
import { useState } from "react";

import { Alerta, Button } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Props = { plantillaId: string; entidadId: string; documentosHref: string; puedeGenerar: boolean };

/** Genera el PDF (`core.documento_plantillas.generar_entidad`) y avisa dónde quedó; una sola vez por clic. */
export function BotonGenerarEntidad({ plantillaId, entidadId, documentosHref, puedeGenerar }: Props) {
  const [estado, setEstado] = useState<"listo" | "generando" | "hecho">("listo");
  const [error, setError] = useState<string | null>(null);
  const [clave] = useState(() => crypto.randomUUID());
  async function generar() {
    setEstado("generando");
    setError(null);
    const r = await ejecutarCapacidad("erp", "core.documento_plantillas.generar_entidad", { plantillaId, entidadId }, false, "layout", clave);
    if (r.ok) setEstado("hecho");
    else {
      setError(r.error.message);
      setEstado("listo");
    }
  }
  if (estado === "hecho")
    return (
      <Alerta tono="success" titulo="Documento generado">
        El PDF quedó en los documentos.{" "}
        <Link href={documentosHref} className="underline">
          Ver documentos
        </Link>
      </Alerta>
    );
  return (
    <div className="flex flex-col gap-2">
      {error ? <Alerta tono="danger" titulo="No se pudo generar el PDF">{error}</Alerta> : null}
      <Button type="button" disabled={!puedeGenerar || estado === "generando"} cargando={estado === "generando"} onClick={() => void generar()}>
        Generar PDF
      </Button>
    </div>
  );
}
