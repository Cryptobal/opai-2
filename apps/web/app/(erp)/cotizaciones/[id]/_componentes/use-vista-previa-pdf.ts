"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Tiempo máximo de espera de la vista previa antes de ofrecer «Reintentar» (CAR-162). */
export const TIEMPO_MAXIMO_PDF_MS = 20_000;
export const MENSAJE_TIEMPO_PDF = "El PDF tarda más de lo normal. Reintenta en unos segundos.";

export type EstadoVistaPrevia =
  | { fase: "generando" }
  | { fase: "listo"; pdfUrl: string; paginas: number | null }
  | { fase: "error"; mensaje: string };

/**
 * Genera la vista previa una vez por cotización (y por cada «Reintentar»). Siempre termina: el PDF,
 * el error del servidor o, a los 20 s, el aviso de demora; una respuesta tardía de un intento viejo
 * se descarta.
 */
export function useVistaPreviaPdf(cotizacionId: string) {
  const { ejecutar, error } = useCapacidad("erp");
  const [estado, setEstado] = useState<EstadoVistaPrevia>({ fase: "generando" });
  const [intento, setIntento] = useState(0);
  const vigente = useRef(0);

  useEffect(() => {
    const contador = vigente;
    const id = ++contador.current;
    const reloj = setTimeout(() => {
      if (contador.current === id) setEstado({ fase: "error", mensaje: MENSAJE_TIEMPO_PDF });
    }, TIEMPO_MAXIMO_PDF_MS);
    void ejecutar("cpq.cotizaciones.preview_pdf", { id: cotizacionId }, true).then((r) => {
      clearTimeout(reloj);
      if (contador.current !== id) return;
      if (r && typeof r === "object" && "pdfBase64" in r) {
        const data = r as { pdfBase64: string; bytes?: number };
        setEstado({
          fase: "listo",
          pdfUrl: `data:application/pdf;base64,${data.pdfBase64}`,
          paginas: data.bytes ? Math.max(1, Math.round(data.bytes / 12_000)) : null,
        });
      } else {
        setEstado({ fase: "error", mensaje: "" });
      }
    });
    return () => {
      clearTimeout(reloj);
      contador.current++;
    };
  }, [cotizacionId, ejecutar, intento]);

  const reintentar = useCallback(() => {
    setEstado({ fase: "generando" });
    setIntento((n) => n + 1);
  }, []);

  // El mensaje del servidor llega por `error` de useCapacidad; si no hay, uno genérico.
  const mensaje =
    estado.fase === "error"
      ? estado.mensaje || error || "No se pudo generar la vista previa del PDF."
      : null;
  return { estado, mensaje, reintentar };
}
