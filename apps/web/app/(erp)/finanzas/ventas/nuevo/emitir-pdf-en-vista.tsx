"use client";

import { useEffect, useState } from "react";

import { Alerta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

/**
 * PDF del borrador dentro de «Revisar emisión» (CAR-249): se carga al abrir la vista previa, con la marca «BORRADOR» y sin
 * folio ni timbre. Si no se puede generar, la persona igual puede confirmar: el PDF es solo para revisar.
 */
export function EmitirPdfEnVista({ documentoId }: { documentoId: string }) {
  const { ejecutar, error } = useCapacidad("erp");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let objeto: string | null = null;
    void ejecutar<{ base64: string }>("finanzas.ventas.preview_pdf", { documentoId }, false, "ninguna").then((r) => {
      if (!r || cancelado) return;
      const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      objeto = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      setUrl(objeto);
    });
    return () => {
      cancelado = true;
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [ejecutar, documentoId]);

  if (error) {
    return <Alerta tono="warning" titulo="No se pudo mostrar el PDF del borrador">{error} Puedes confirmar igual: revisa los datos de arriba.</Alerta>;
  }
  return (
    <div className="flex flex-col gap-2">
      <h3 className="t-label text-fg">Así quedará el documento</h3>
      {url ? (
        <iframe src={url} title="Vista previa del borrador en PDF" className="h-[60dvh] w-full rounded-md border border-border" />
      ) : (
        <p className="text-sm text-fg-muted" role="status">Preparando el PDF…</p>
      )}
      <p className="text-xs text-fg-muted">Solo una vista previa: lleva la marca «BORRADOR», sin folio ni timbre del SII.</p>
    </div>
  );
}
