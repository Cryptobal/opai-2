"use client";

import { Copy, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";

import { avisar, Button } from "@opai/ds";

type Ejecutar = (id: string, input: unknown) => Promise<unknown | null>;

export function AccionesCotizacionExtras({
  cotizacionId,
  puedeNuevaVersion,
  pendiente,
  ejecutar,
  limpiarError,
  onHecho,
}: {
  cotizacionId: string;
  puedeNuevaVersion: boolean;
  pendiente: boolean;
  ejecutar: Ejecutar;
  limpiarError: () => void;
  onHecho: () => void;
}) {
  const router = useRouter();
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={pendiente}
        onClick={() => {
          limpiarError();
          void ejecutar("cpq.cotizaciones.clonar", { id: cotizacionId }).then((r) => {
            const data = r as { id: string; codigo: string } | null;
            if (data?.id) {
              avisar.exito(`Cotización clonada: ${data.codigo}`);
              router.push(`/cotizaciones/${data.id}`);
            }
          });
        }}
      >
        <Copy className="size-4" aria-hidden />
        Clonar
      </Button>
      {puedeNuevaVersion ? (
        <Button
          type="button"
          variant="ghost"
          disabled={pendiente}
          onClick={() => {
            limpiarError();
            void ejecutar("cpq.versiones.crear", { cotizacionId }).then((r) => {
              if (r != null) {
                avisar.exito("Nueva versión creada");
                onHecho();
              }
            });
          }}
        >
          <GitBranch className="size-4" aria-hidden />
          Nueva versión
        </Button>
      ) : null}
    </>
  );
}
