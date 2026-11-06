"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import type { PortalRendicion } from "./tipos";

/** Abre la boleta o factura ya subida con una URL firmada de 5 minutos, pedida al hacer clic (no se guarda). */
export function BotonRespaldo({
  portal,
  rendicionId,
  documentoId,
}: {
  portal: PortalRendicion;
  rendicionId: string;
  documentoId: string;
}) {
  const [ocupado, setOcupado] = useState(false);
  async function ver() {
    setOcupado(true);
    const r = await ejecutarCapacidad(portal, "rendiciones.respaldos.url_descarga", {
      rendicionId,
      documentoId,
    });
    setOcupado(false);
    if (!r.ok) return avisar.error("No se pudo abrir el respaldo. Inténtalo de nuevo.");
    window.open((r.data as { url: string }).url, "_blank", "noopener,noreferrer");
  }
  return (
    <Button variant="secondary" onClick={() => void ver()} disabled={ocupado}>
      {ocupado ? "Abriendo…" : "Ver respaldo"}
    </Button>
  );
}
