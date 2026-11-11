"use client";

import { Pencil } from "lucide-react";

import { Button, Card } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { DescartarBorrador } from "./descartar-borrador";

/**
 * Acciones de la ficha de un borrador (CAR-261), de más a menos importante: emitir (primaria, ancho completo en el teléfono),
 * revisar y editar (secundarias, juntas) y descartar (destructiva, aparte y con su confirmación).
 */
export function BloqueAccionesBorrador(p: {
  documentoId: string;
  etiquetaEmitir: string;
  etiquetaDescartar: string;
  pendiente: boolean;
  revisarEmision: () => void;
  emitir: () => void;
  editar: () => void;
}) {
  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="t-label text-fg">Emisión al SII</h2>
        <p className="text-sm text-fg-muted">
          Borrador guardado. Revisa la emisión antes de asignar folio y firmar. Si la pide un agente, queda en{" "}
          <LinkNext href="/configuracion/aprobaciones" className="underline">
            aprobaciones pendientes
          </LinkNext>
          .
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button size="lg" block disabled={p.pendiente} onClick={p.emitir} className="md:h-10 md:w-auto md:self-start md:text-base">
          {p.etiquetaEmitir}
        </Button>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Button variant="secondary" disabled={p.pendiente} onClick={p.revisarEmision}>Revisar emisión</Button>
          <Button variant="secondary" onClick={p.editar}>
            <Pencil className="size-4" aria-hidden /> Editar
          </Button>
        </div>
      </div>
      <div className="border-t border-border pt-4">
        <DescartarBorrador documentoId={p.documentoId} etiqueta={p.etiquetaDescartar} destino="/finanzas/ventas" variante="destructive" className="w-full md:w-auto" />
      </div>
    </Card>
  );
}
