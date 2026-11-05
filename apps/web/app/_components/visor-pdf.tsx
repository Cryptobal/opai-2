"use client";

import { useSyncExternalStore } from "react";

import { Button } from "@opai/ds";

const TACTIL = "(hover: none) and (pointer: coarse)";

function suscribir(avisar: () => void) {
  const m = window.matchMedia(TACTIL);
  m.addEventListener("change", avisar);
  return () => m.removeEventListener("change", avisar);
}

/** Pantalla táctil sin cursor (teléfono, tablet): el visor de PDF en iframe no se pinta en iOS (CAR-192). */
export function useEsTactil(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(TACTIL).matches,
    () => false,
  );
}

export function descargarPdf(pdfUrl: string, nombre: string) {
  const a = document.createElement("a");
  a.href = pdfUrl;
  a.download = nombre;
  a.click();
}

/**
 * PDF de una URL `blob:`. En escritorio, iframe; en pantalla táctil, «Abrir PDF» (visor del sistema) y
 * «Descargar PDF», porque Safari de iOS no pinta un `blob:` en un iframe y lo deja en blanco.
 * `onCerrar` agrega el botón «Cerrar» junto a las acciones.
 */
export function VisorPdf({
  pdfUrl,
  titulo,
  nombreArchivo,
  alto = "h-[70vh]",
  onCerrar,
}: {
  pdfUrl: string;
  titulo: string;
  nombreArchivo: string;
  alto?: string;
  onCerrar?: () => void;
}) {
  const tactil = useEsTactil();
  if (tactil) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <p className="t-body-sm text-fg-muted">
          Este dispositivo no muestra el PDF dentro de la página. Ábrelo en el visor o descárgalo.
        </p>
        <Button type="button" size="lg" block onClick={() => window.open(pdfUrl, "_blank", "noopener")}>
          Abrir PDF
        </Button>
        <Button type="button" variant="secondary" size="lg" block onClick={() => descargarPdf(pdfUrl, nombreArchivo)}>
          Descargar PDF
        </Button>
        {onCerrar ? (
          <Button type="button" variant="ghost" size="lg" block onClick={onCerrar}>
            Cerrar
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <iframe title={titulo} src={pdfUrl} className={`${alto} w-full max-w-full rounded-md border border-border`} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => descargarPdf(pdfUrl, nombreArchivo)}>
          Descargar PDF
        </Button>
        {onCerrar ? (
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
