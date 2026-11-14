"use client";

import { avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { descargarPdf } from "@/app/_components/visor-pdf";

/** Descarga el PDF de una factura de la cuenta (CAR-518); el servidor vuelve a validar que el contacto la ve. */
export function BotonPdf({ documentoId, nombre }: { documentoId: string; nombre: string }) {
  const { ejecutar, pendiente } = useCapacidad("cliente");
  async function descargar() {
    const r = await ejecutar<{ base64: string }>(
      "portal_cliente.facturas.pdf",
      { documentoId },
      false,
      "ninguna",
    );
    if (!r) return avisar.error("No pudimos descargar el PDF. Vuelve a intentarlo.");
    const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    descargarPdf(url, nombre);
    URL.revokeObjectURL(url);
  }
  return (
    <Button variant="ghost" disabled={pendiente} onClick={() => void descargar()}>
      PDF
    </Button>
  );
}
