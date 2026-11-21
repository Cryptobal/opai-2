"use client";

import { useState } from "react";

import { qrDeEmparejamiento } from "@/app/_acciones/dispositivos";

export type CodigoUrl = { codigo: string; url: string };

/** Estado compartido del diálogo de código + QR (emparejar dispositivo o enlace de marcación). */
export function useCodigoQrDialog(limpiarError: () => void) {
  const [codigo, setCodigo] = useState<CodigoUrl | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cerrar = () => {
    setCodigo(null);
    setSvg(null);
    setCopiado(false);
    limpiarError();
  };

  const mostrar = async (valor: CodigoUrl | null | undefined) => {
    if (!valor?.codigo || !valor.url) return;
    setCodigo(valor);
    setSvg(await qrDeEmparejamiento(valor.url));
  };

  return { codigo, svg, copiado, setCopiado, cerrar, mostrar, abierto: codigo !== null };
}