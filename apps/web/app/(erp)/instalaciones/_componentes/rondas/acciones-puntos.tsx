"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

import { Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Etiqueta = { puntoId: string; nombre: string; codigo: string };
type Hoja = { total: number; etiquetas: Etiqueta[] };

/**
 * «Imprimir etiquetas» (CA12, c13p): llama a `rondas.etiquetas.pdf`, que en el PR 1 devuelve el
 * manifiesto de puntos con QR y su código opaco. Abre la vista de impresión del navegador (imprimir
 * o guardar como PDF) con la marca y el nombre de la instalación. El PDF firmado y persistido en
 * `core.documentos` llega en el PR 2 (ver `rondas.etiquetas.pdf`).
 */
export function AccionesPuntos({
  instalacionId,
  instalacionNombre,
  puede,
}: {
  instalacionId: string;
  instalacionNombre: string;
  puede: boolean;
}) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [hoja, setHoja] = useState<Hoja | null>(null);
  if (!puede) return null;
  async function imprimir() {
    const r = await ejecutar<Hoja>("rondas.etiquetas.pdf", { instalacionId }, false, "ninguna");
    if (r) setHoja(r);
  }
  return (
    <>
      <Button variant="secondary" onClick={imprimir} cargando={pendiente}>
        <Printer className="size-4" aria-hidden />
        Imprimir etiquetas
      </Button>
      <Dialog
        abierto={hoja !== null}
        onCerrar={() => setHoja(null)}
        titulo="Etiquetas para imprimir"
        descripcion={`${instalacionNombre} · ${hoja?.total ?? 0} punto(s) con etiqueta QR`}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setHoja(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Imprimir
            </Button>
          </>
        }
      >
        {hoja && hoja.etiquetas.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {hoja.etiquetas.map((e) => (
              <li
                key={e.puntoId}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <span className="truncate font-medium">{e.nombre}</span>
                <span className="t-numeric t-caption">{e.codigo}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body-sm text-fg-muted">
            No hay puntos con etiqueta QR activa en esta instalación.
          </p>
        )}
      </Dialog>
    </>
  );
}
