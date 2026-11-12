"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/** Abre el PDF con un enlace firmado de 5 minutos, pedido al hacer clic (no se guarda ni se comparte). */
export function BotonPdf({
  cotizacionId,
  tipo,
  etiqueta,
}: {
  cotizacionId: string;
  tipo: "cotizacion" | "propuesta";
  etiqueta: string;
}) {
  const [ocupado, setOcupado] = useState(false);
  async function abrir() {
    setOcupado(true);
    const r = await ejecutarCapacidad("cliente", "cpq.portal_cotizaciones.descargar", { cotizacionId, tipo });
    setOcupado(false);
    if (!r.ok) return avisar.error("No se pudo abrir el documento. Inténtalo de nuevo.");
    window.open((r.data as { url: string }).url, "_blank", "noopener,noreferrer");
  }
  return (
    <Button variant="secondary" onClick={() => void abrir()} disabled={ocupado} aria-label={`${etiqueta}`}>
      {ocupado ? "Abriendo…" : etiqueta}
    </Button>
  );
}
