"use client";

import { MoreHorizontal } from "lucide-react";

import { Alerta, Button, Menu, type ItemMenu } from "@opai/ds";

import { AccionesAprobacionMargen } from "./acciones-cotizacion-aprobacion";
import { AccionesCotizacionExtras } from "./acciones-cotizacion-extras";
import type { BloqueoEnvioCpq } from "./acciones-cotizacion-logica";

export function AccionesCotizacionCabecera({
  bloqueo,
  ocultar,
  pedirDeshabilitado,
  botonPrimaria,
  extrasProps,
  items,
  aprobacion,
  error,
  avisoBloqueo,
}: {
  bloqueo: BloqueoEnvioCpq | null;
  ocultar: boolean;
  pedirDeshabilitado: boolean;
  botonPrimaria: (clase?: string) => React.ReactNode;
  extrasProps: React.ComponentProps<typeof AccionesCotizacionExtras>;
  items: ItemMenu[];
  aprobacion: React.ComponentProps<typeof AccionesAprobacionMargen>;
  error: string | null;
  avisoBloqueo: (b: BloqueoEnvioCpq) => React.ReactNode;
}) {
  const claseTelefono = ocultar ? "hidden md:inline-flex" : undefined;
  const extras = <AccionesCotizacionExtras {...extrasProps} />;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {bloqueo ? (
        <div className={ocultar ? "hidden md:block" : undefined}>{avisoBloqueo(bloqueo)}</div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {pedirDeshabilitado ? (
          <Button type="button" disabled title={bloqueo?.mensaje} className={claseTelefono}>
            Pedir aprobación
          </Button>
        ) : (
          botonPrimaria(claseTelefono)
        )}
        {ocultar ? null : extras}
        {ocultar && items.length > 0 ? (
          <div className="md:hidden">
            <Menu
              etiqueta="Más acciones de la cotización"
              items={items}
              disparador={<MoreHorizontal className="size-5" aria-hidden />}
              claseDisparador="border border-border-strong bg-surface size-11"
            />
          </div>
        ) : null}
        <AccionesAprobacionMargen {...aprobacion} />
        {ocultar ? <div className="hidden md:contents">{extras}</div> : null}
      </div>
      {error ? <Alerta tono="danger" titulo={error} className="w-full max-w-xl" /> : null}
    </div>
  );
}
