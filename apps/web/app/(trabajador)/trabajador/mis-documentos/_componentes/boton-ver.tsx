"use client";

import { useState } from "react";

import { avisar, Button } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

/**
 * Abre un documento propio con una URL firmada de 5 minutos, pedida al tocar (no se guarda). Cada apertura queda
 * registrada por la capacidad (CAR-463).
 */
export function BotonVer({ id, titulo }: { id: string; titulo: string }) {
  const [ocupado, setOcupado] = useState(false);
  async function ver() {
    // La pestaña se abre dentro del toque (antes del await): Safari en iPhone bloquea las que se abren después.
    const pestana = window.open("", "_blank");
    if (pestana) pestana.opener = null;
    setOcupado(true);
    const r = await ejecutarCapacidad("trabajador", "portal_trabajador.mis_documentos.descargar", { id });
    setOcupado(false);
    if (!r.ok) {
      pestana?.close();
      return avisar.error("No se pudo abrir el documento. Inténtalo de nuevo.");
    }
    const url = (r.data as { url: string }).url;
    if (pestana) pestana.location.href = url;
    else window.location.assign(url);
  }
  return (
    <Button variant="secondary" onClick={() => void ver()} disabled={ocupado} aria-label={`Ver ${titulo}`}>
      {ocupado ? "Abriendo…" : "Ver"}
    </Button>
  );
}
