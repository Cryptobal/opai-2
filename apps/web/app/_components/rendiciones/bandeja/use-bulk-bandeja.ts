"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar } from "@opai/ds";

import { type AccionBulk, type SalidaBulk, ejecutarBulk, textoVistaPrevia } from "./bulk-bandeja";
import { RUTA_BANDEJA } from "./tipos";

export function useBulkBandeja(ids: string[], motivo: string) {
  const router = useRouter();
  const [dialogo, setDialogo] = useState<AccionBulk | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function vistaPrevia(accion: AccionBulk) {
    setError(null);
    if (accion === "rechazar" && motivo.trim().length < 3)
      return setError("Escribe el motivo (mínimo 3 letras) para rechazar.");
    setOcupado(true);
    const r = await ejecutarBulk(accion, ids, motivo, true);
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    setPreview(textoVistaPrevia(r.data as SalidaBulk));
    setDialogo(accion);
  }

  async function confirmar() {
    if (!dialogo) return;
    setOcupado(true);
    setError(null);
    const r = await ejecutarBulk(dialogo, ids, motivo, false);
    setOcupado(false);
    if (!r.ok) return setError(r.error.message);
    const n = (r.data as SalidaBulk).aplicadas.length;
    avisar.exito(`${n} rendiciones ${dialogo === "aprobar" ? "aprobadas" : "rechazadas"}`);
    setDialogo(null);
    router.push(RUTA_BANDEJA);
    router.refresh();
  }

  return { dialogo, preview, ocupado, error, vistaPrevia, confirmar, cerrarDialogo: () => setDialogo(null) };
}